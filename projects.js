class RepositoryProjectsManager {
  constructor({ owner, repository, octokit }) {
    this.owner = owner;
    this.repositoryName = repository;
    this.octokit = octokit;
    this.clientMutationId = `assign-to-repository-projects-${owner}-${repository}`;
  }

  async assign(pullRequestId, titles) {
    await this.#init();

    const assignedProjects = await this.#fetchAssignedProjects({ pullRequestId });
    await this.#assignPRToProjects(pullRequestId, titles, assignedProjects);
    await this.#unassignPRFromProjects(pullRequestId, titles, assignedProjects);

    return this.#fetchAssignedProjects({ pullRequestId });
  }

  async #init() {
    this.organization = this.#fetchOrganization({ owner: this.owner });

    const repository = await this.#fetchRepositoryAndProjects({
      owner: this.owner,
      repositoryName: this.repositoryName,
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
      const item = await this.#assignPRtoProject(pullRequestId, project, this.clientMutationId);

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

    return this.#updateItemFieldValue({
      project,
      item,
      statusField,
      todoOption,
      clientMutationId: this.clientMutationId,
    });
  }

  // unassign PR from projects that are not listed by titles
  async #unassignPRFromProjects(pullRequestId, titles, assignedProjects) {
    const projects = assignedProjects.filter((p) => !titles.includes(p.title));

    for await (const project of projects) {
      // async, because more than 5 breaks API endpoint
      const item = await this.#fetchItemForPRId({ project, pullRequestId });
      await this.#deleteProjectItem(project, item);
    }
  }

  async #fetchAssignedProjects({ pullRequestId }) {
    const { node: { projectsV2: { nodes } } } = await this.octokit.graphql.paginate(`
      query paginate($cursor: String) {
        node(id:"${pullRequestId}") {
          ... on PullRequest {
            number
            projectsV2(first: 100, after: $cursor) {
              nodes {
                id
                title
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }`);

    return nodes;
  }

  // we need to know the item id of a PR in the project.
  // we know this item exists
  async #fetchItemForPRId({ project, pullRequestId }) {
    const { node: { items: { nodes } } } = await this.octokit.graphql.paginate(`
      query paginate($cursor: String) {
        node(id:"${project.id}") {
          ... on ProjectV2 {
            number
            items(first: 100, after: $cursor) {
              nodes {
                id
                content {
                  ... on PullRequest {
                    id
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }`);

    return nodes.find((item) => item.content.id === pullRequestId);
  }

  // requires GitHub App installation token with read and write
  // permissions for projects v2 and pull requests
  async #deleteProjectItem(project, item) {
    const { deleteProjectV2Item: deletedItemId } = await this.octokit.graphql(`
      mutation {
        deleteProjectV2Item(
          input: {
            clientMutationId: "${this.clientMutationId}",
            itemId: "${item.id}",
            projectId: "${project.id}",
          }
        )
        {
          deletedItemId
        }
      }`);

    return deletedItemId;
  }

  // the GitHub Action's event may only contain the "old" GraphQL node id.
  // this produces deprecation warnings. as a workaround, look up the "new" ID.
  // https://github.blog/changelog/label/deprecation/
  async #fetchOrganization({ owner }) {
    const { organization } = await this.octokit.graphql(
      `query {
         organization(login: "${owner}") {
           id
           name
         }
      }`,
      {
        headers: {
          'X-Github-Next-Global-ID': '1',
        },
      },
    );

    return organization;
  }

  async #fetchRepositoryAndProjects({ owner, repositoryName }) {
    const { repository } = await this.octokit.graphql.paginate(`
      query paginate($cursor: String) {
        repository(owner: "${owner}", name: "${repositoryName}") {
          name
          id
          projectsV2(first: 100, after: $cursor) {
            nodes {
              id
              title
              number
              fields(first: 5) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }`);
    return repository;
  }

  // requires GitHub App installation token with read and write
  // permissions for projects v2 and pull requests
  async #assignPRtoProject(pullRequestId, project, clientMutationId) {
    const { addProjectV2ItemById: { item } } = await this.octokit.graphql(`
      mutation {
        addProjectV2ItemById(
          input: {
            clientMutationId: "${clientMutationId}",
            contentId: "${pullRequestId}",
            projectId: "${project.id}",
          }
        )
        {
          item {
            id
          }
        }
      }`);

    return item;
  }

  async #updateItemFieldValue({
    clientMutationId, project, item, statusField, todoOption,
  }) {
    // https://docs.github.com/en/graphql/reference/mutations#updateprojectv2itemfieldvalue
    const result = await this.octokit.graphql(`
      mutation {
        updateProjectV2ItemFieldValue(
          input: {
            clientMutationId: "${clientMutationId}",
            projectId: "${project.id}",
            fieldId: "${statusField.id}",
            itemId: "${item.id}",
            value: {
              singleSelectOptionId: "${todoOption.id}"
            }
          }
        ){
           projectV2Item {
             id
           }
         }
      }`);

    return result;
  }
}

export { RepositoryProjectsManager }; // eslint-disable-line import/prefer-default-export
