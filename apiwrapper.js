class ApiWrapper {
  #octokit;

  constructor({ octokit }) {
    this.#octokit = octokit;
  }

  async fetchAssignedProjects({ pullRequestId }) {
    const { node: { projectsV2: { nodes } } } = await this.#octokit.graphql.paginate(`
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
  async fetchItemForPRId({ project, pullRequestId }) {
    const { node: { items: { nodes } } } = await this.#octokit.graphql.paginate(`
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
  async deleteProjectItem({ project, item, clientMutationId }) {
    const { deleteProjectV2Item: deletedItemId } = await this.#octokit.graphql(`
      mutation {
        deleteProjectV2Item(
          input: {
            clientMutationId: "${clientMutationId}",
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

  async fetchRepositoryAndProjects({ owner, repositoryName }) {
    const { repository } = await this.#octokit.graphql.paginate(`
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
  async assignPRtoProject({ pullRequestId, project, clientMutationId }) {
    const { addProjectV2ItemById: { item } } = await this.#octokit.graphql(`
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

  async updateItemFieldValue({
    clientMutationId, project, item, statusField, todoOption,
  }) {
    // https://docs.github.com/en/graphql/reference/mutations#updateprojectv2itemfieldvalue
    const result = await this.#octokit.graphql(`
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

export { ApiWrapper }; // eslint-disable-line import/prefer-default-export
