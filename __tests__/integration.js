import { Octokit } from '@octokit/core';
import { paginateGraphql } from '@octokit/plugin-paginate-graphql';

import { graphql, HttpResponse } from 'msw'; // https://mswjs.io/docs/getting-started
import { setupServer } from 'msw/node'; // https://mswjs.io/docs/getting-started/integrate/node

import { ApiWrapper } from '../apiwrapper';
import { RepositoryProjectsManager } from '../projects.js'; // eslint-disable-line import/extensions

const GraphQlOctokit = Octokit.plugin(paginateGraphql);
const octokit = new GraphQlOctokit({ auth: 'fake-token-value' }); // don't use default GITHUB_TOKEN token from env

const apiWrapper = new ApiWrapper({ octokit });

const rpm = new RepositoryProjectsManager({ apiWrapper, ownerName: 'acme', repositoryName: 'example-repository' });

describe('RepositoryProjectsManager integration test', () => {
  let server;

  afterEach(() => {
    server.close();
  });

  beforeEach(() => {
    let count = 0;
    server = setupServer(

      graphql.query(/paginate/, () => {
        // registering mutiple handlers for the same matcher does not work.
        // instead there is only this single handler for paginated GraphQL queres.

        const orderedPaginatedQueryResponses = [
          // fetchRepositoryAndProjects
          {
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
          },

          // fetchAssignedProjects
          {
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
          },

          // fetchAssignedProjects (2nd call)
          {
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
          },
        ];

        const response = orderedPaginatedQueryResponses[count];
        count += 1;
        return HttpResponse.json(response);
      }),

      graphql.mutation(/assignPRtoProject/, () => HttpResponse.json({
        data: {
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_0000000000000001',
            },
          },
        },
      })),

      graphql.mutation(/updateItemFieldValue/, () => HttpResponse.json({
        data: {
          updateProjectV2ItemFieldValue: {
            projectV2Item: {
              id: 'PVTI_0000000000000001',
            },
          },
        },
      })),
    );
    server.listen();
  });

  test('when the PR is not assigned to a project yet', async () => {
    const titles = ['layer-100/bar'];

    const pullRequestNumber = 'PR_0000000000000001';

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });
});
