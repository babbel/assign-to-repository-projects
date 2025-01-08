import { Octokit } from '@octokit/core'; // eslint-disable-line import/no-extraneous-dependencies
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';

import { graphql, HttpResponse } from 'msw'; // https://mswjs.io/docs/getting-started
import { setupServer } from 'msw/node'; // https://mswjs.io/docs/getting-started/integrate/node

import { ApiWrapper } from '../apiwrapper';
import { RepositoryProjectsManager } from '../projects.js'; // eslint-disable-line import/extensions

const GraphQlOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new GraphQlOctokit({ auth: 'fake-token-value' }); // don't use default GITHUB_TOKEN token from env

const apiWrapper = new ApiWrapper({ octokit });

const rpm = new RepositoryProjectsManager({ apiWrapper, ownerName: 'acme', repositoryName: 'example-repository' });

let server = null;

const mock = ({ action, matcher, data }) => {
  const actions = {
    mutation: graphql.mutation,
    query: graphql.query,
  };

  return actions[action](matcher, () => HttpResponse.json({ data }), { once: true });
};

describe('RepositoryProjectsManager integration test', () => {
  beforeAll(() => {
    server = setupServer();
    server.listen();
  });

  afterEach(() => {
    server.close();
  });

  beforeEach(() => {
    server.use(

      // fetchRepositoryAndProjects
      mock({
        action: 'query',
        matcher: /paginate/,
        data: {
          repository: {
            name: 'example-repository',
            id: 'R_0000000001',

            projectsV2: {
              nodes: [
                {
                  id: 'PVT_0000000000000001',
                  title: 'layer-100/bar',
                  number: 1099,
                  fields: {
                    nodes: [
                      {},
                      {},
                      {
                        id: 'PVTSSF_00000000000000000000001',
                        name: 'Status',
                        options: [
                          {
                            id: '00000001',
                            name: 'Todo',
                          },
                          {
                            id: '00000002',
                            name: 'In Progress',
                          },
                          {
                            id: '00000003',
                            name: 'Done',
                          },
                        ],
                      },
                      {},
                      {},
                    ],
                  },
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'Nw',
              },
            },
          },
        },
      }),

      // fetchAssignedProjects
      mock({
        action: 'query',
        matcher: /paginate/,
        data: {
          node: {
            number: 74,
            projectsV2: {
              nodes: [],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'MQ',
              },
            },
          },
        },
      }),

      // fetchAssignedProjects (2nd call)
      mock({
        action: 'query',
        matcher: /paginate/,
        data: {
          node: {
            number: 74,
            projectsV2: {
              nodes: [
                {
                  id: 'PVT_0000000000000001',
                  title: 'layer-100/bar',
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'MQ',
              },
            },
          },
        },
      }),

      mock({
        action: 'mutation',
        matcher: /assignPRtoProject/,
        data: {
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_0000000000000001',
            },
          },
        },
      }),

      mock({
        action: 'mutation',
        matcher: /updateItemFieldValue/,
        data: {
          updateProjectV2ItemFieldValue: {
            projectV2Item: {
              id: 'PVTI_0000000000000001',
            },
          },
        },
      }),

    );
  });

  test('when the PR is not assigned to a project yet', async () => {
    const titles = ['layer-100/bar'];

    const pullRequestNumber = 'PR_0000000000000001';

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });
});
