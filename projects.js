class RepositoryProjectsManager {
  #apiWrapper;

  #clientMutationId;

  #owner;

  #repositoryName;

  constructor({ owner, repository, apiWrapper }) {
    this.#apiWrapper = apiWrapper;
    this.#owner = owner;
    this.#repositoryName = repository;
    this.#clientMutationId = `assign-to-repository-projects-${owner}-${repository}`;
  }

  async assign(pullRequestId, titles) {
    await this.#init();

    const assignedProjects = await this.#apiWrapper.fetchAssignedProjects({ pullRequestId });
    await this.#assignPRToProjects(pullRequestId, titles, assignedProjects);
    await this.#unassignPRFromProjects(pullRequestId, titles, assignedProjects);

    return this.#apiWrapper.fetchAssignedProjects({ pullRequestId });
  }

  async #init() {
    this.organization = this.#apiWrapper.fetchOrganization({ owner: this.#owner });

    const repository = await this.#apiWrapper.fetchRepositoryAndProjects({
      owner: this.#owner,
      repositoryName: this.#repositoryName,
    });

    this.repository = repository;
    this.projects = repository.projectsV2.nodes;
  }

  async #assignPRToProjects(pullRequestId, titles, assignedProjects) {
    const assignedTitles = assignedProjects.map((p) => p.title);

    const projects = this.projects
      .filter((p) => titles.includes(p.title))
      .filter((p) => !assignedTitles.includes(p.title));

    for await (const project of projects) {
      // async, because more than 5 breaks API endpoint
      const item = await this.#apiWrapper.assignPRtoProject({
        project,
        pullRequestId,
        clientMutationId: this.#clientMutationId,
      });

      // at creation, items can only be assigned to projecs but initially
      // have Status value null.
      // the `Todo` Status value is created by default for each new project and
      // must be assiged. to do so, the option value needs to be looked up first.
      // (project automations cannot be used for this task because there is no API
      // for creating or updating ProjectV2 workflows.)
      await this.#assignStatusTodo(project, item);
    }
  }

  async #assignStatusTodo(project, item) {
    // the `Status` field and  `Todo` option are generated with each Project V2 by default.
    const statusField = project.fields.nodes.find((n) => Object.keys(n) !== 0 && n.name === 'Status');
    const todoOption = statusField.options.find((o) => o.name === 'Todo');

    return this.#apiWrapper.updateItemFieldValue({
      project,
      item,
      statusField,
      todoOption,
      clientMutationId: this.#clientMutationId,
    });
  }

  // unassign PR from projects that are not listed by titles
  async #unassignPRFromProjects(pullRequestId, titles, assignedProjects) {
    const projects = assignedProjects.filter((p) => !titles.includes(p.title));

    for await (const project of projects) {
      // async, because more than 5 breaks API endpoint
      const item = await this.#apiWrapper.fetchItemForPRId({ project, pullRequestId });
      await this.#apiWrapper.deleteProjectItem({
        project,
        item,
        clientMutationId: this.#clientMutationId,
      });
    }
  }
}

export { RepositoryProjectsManager }; // eslint-disable-line import/prefer-default-export
