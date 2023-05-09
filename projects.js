class RepositoryProjectsManager {
  constructor({ owner, repository, octokit }) {
    this.owner = owner;
    this.repositoryName = repository;
    this.octokit = octokit;
    this.clientMutationId = (Math.random() + 1).toString(36).substring(16);
  }

  async init() {
    // the GitHub Action's event may only contain the "old" GraphQL node id.
    // this produces deprecation warnings. as a workaround, look up the "new" ID.
    // https://github.blog/changelog/label/deprecation/
    const { organization } = await this.octokit.graphql(
      `query {
         organization(login: "${this.owner}") {
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
    this.organization = organization;

    await this.#fetchRepositoryAndProjects();
  }

  async sync(titles) {
    await this.#createMissingProjectsFrom(titles);
    await this.#deleteProjectsNotIn(titles);
  }

  async #fetchRepositoryAndProjects() {
    const response = await this.octokit.graphql.paginate(
      `query paginate($cursor: String) {
         repository(owner: "${this.owner}", name: "${this.repositoryName}") {
           name
           url
           id
           projectsV2(first: 10, after: $cursor) {
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
    }`,
    );
    this.repository = response.repository;
    this.projects = response.repository.projectsV2.nodes;
  }

  async #createMissingProjectsFrom(titles) {
    const missing = titles.filter((title) => !this.projects.map((p) => p.title).includes(title));

    for await (const title of missing) {
      // call synchronously because more than 5 async requests break API endpoint
      await this.#createProject(title);
    }
  }

  async #deleteProjectsNotIn(titles) {
    const unspecified = this.projects.filter((p) => !titles.includes(p.title));

    for await (const project of unspecified) {
      await this.#deleteProject(project); // more than 5 breaks API endpoint
    }
  }

  async #createProject(title) {
    const { createProjectV2: { projectV2: { id } } } = await this.octokit.graphql(`
      mutation{
        createProjectV2(
          input: {
            ownerId: "${this.organization.id}",
            title: "${title}",
            repositoryId: "${this.repository.id}",
          }
        ){
          projectV2 {
            id
          }
         }
      }
    `);

    return id;
  }

  async #deleteProject(project) {
    const { projectId: id } = await this.octokit.graphql(`
      mutation{
        deleteProjectV2(
          input: {
            clientMutationId: "${this.clientMutationId}"
            projectId: "${project.id}",
          }
        ){
          projectV2 {
            id
          }
         }
      }
    `);

    return id;
  }

  async assign(pullRequestId, projectNames) {
    const projects = this.projects.filter((p) => projectNames.includes(p.title));

    for await (const project of projects) {
      // async, because more than 5 breaks API endpoint
      const item = await this.#assignPRtoProject(pullRequestId, project);

      // items can only be assigned to projecs.
      // after that the item has Status value null.
      // only then, they can be assigned a particular Status.
      // the `Todo` Status is created by default for each new project.
      // to assign Status value `Todo` to an item, we need to explicitely assign it.
      // (project workflows cannot be used for this task because there is no API
      // for creating or updating ProjectV2 workflows.)
      await this.#assignStatusTodo(project, item);
    }

    await this.#unassignPRFromProjects(pullRequestId, projectNames);
  }

  // requires GitHub App installation token with read and write
  // permissions for projects v2 and pull requests
  async #assignPRtoProject(pullRequestId, project) {
    const { addProjectV2ItemById: { item } } = await this.octokit.graphql(`
    mutation{
      addProjectV2ItemById(
        input: {
          clientMutationId: "${this.clientMutationId}",
          contentId: "${pullRequestId}",
          projectId: "${project.id}",
        }
     ){
        item {
          id
        }
      }
     }`);

    return item;
  }

  async #assignStatusTodo(project, item) {
    // there are no class constants in node.js
    const statusField = project.fields.nodes.find((n) => Object.keys(n) !== 0 && n.name === 'Status');
    const todoOption = statusField.options.find((o) => o.name === 'Todo');

    // https://docs.github.com/en/graphql/reference/mutations#updateprojectv2itemfieldvalue
    const result = await this.octokit.graphql(`
      mutation{
        updateProjectV2ItemFieldValue(
          input: {
            clientMutationId: "${this.clientMutationId}",
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

  async #unassignPRFromProjects(pullRequestId, projectNames) {
    const assignedProjects = await this.#assignedProjects(pullRequestId);

    const projects = assignedProjects.filter((p) => !projectNames.includes(p.title));

    for await (const project of projects) {
      // async, because more than 5 breaks API endpoint
      const item = await this.#itemFor(project, pullRequestId);
      await this.#deleteProjectItem(project, item);
    }
  }

  async #assignedProjects(pullRequestId) {
    const { node: { projectsV2: { nodes } } } = await this.octokit.graphql.paginate(`
    query paginate($cursor: String) {
      node(id:"${pullRequestId}") {
       ... on PullRequest {
           number
           projectsV2(first: 10, after: $cursor) {
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
  async #itemFor(project, pullRequestId) {
    const { node: { items: { nodes } } } = await this.octokit.graphql.paginate(`
    query paginate($cursor: String) {
      node(id:"${project.id}") {
       ... on ProjectV2 {
           number
           items(first: 10, after: $cursor) {
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
    mutation{
      deleteProjectV2Item(
        input: {
          clientMutationId: "${this.clientMutationId}",
          itemId: "${item.id}",
          projectId: "${project.id}",
        }
     ){
        deletedItemId
      }
     }`);

    return deletedItemId;
  }
}

export { RepositoryProjectsManager }; // eslint-disable-line import/prefer-default-export