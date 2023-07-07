import fetchMock from 'fetch-mock'; // https://github.com/wheresrhys/fetch-mock

import { Octokit } from '@octokit/core';
import { paginateGraphql } from '@octokit/plugin-paginate-graphql';
import { ApiWrapper } from '../apiwrapper';
import { RepositoryProjectsManager } from '../projects.js'; // eslint-disable-line import/extensions

const GraphQlOctokit = Octokit.plugin(paginateGraphql);
const octokit = new GraphQlOctokit({ auth: 'fake-token-value' }); // don't use default GITHUB_TOKEN token from env

const apiWrapper = new ApiWrapper({ octokit });

const rpm = new RepositoryProjectsManager({ apiWrapper, ownerName: 'acme', repositoryName: 'example-repository' });

describe('RepositoryProjectsManager integration test', () => {
  afterAll(() => {
    fetchMock.reset();
  });

  afterEach(() => {
    fetchMock.reset();
  });

  beforeEach(() => {
    fetchMock
      .postOnce({
        name: 'fetchRepositoryAndProjects',
        matcher: 'https://api.github.com/graphql',
        response: {
          status: 200,
          body: {
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
        },
      })

      .postOnce({
        name: 'fetchAssignedProjects',
        matcher: 'https://api.github.com/graphql',
        response: {
          status: 200,
          body: {
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
        },
      })

      .postOnce({
        name: 'addProjectV2ItemById',
        matcher: 'https://api.github.com/graphql',
        response: {
          status: 200,
          body: {
            data: {
              addProjectV2ItemById: {
                item: {
                  id: 'PVTI_0000000000000001',
                },
              },
            },
          },
        },
      })

      .postOnce({
        name: 'updateProjectV2ItemFieldValue',
        matcher: 'https://api.github.com/graphql',
        response: {
          status: 200,
          body: {
            data: {
              updateProjectV2ItemFieldValue: {
                projectV2Item: {
                  id: 'PVTI_0000000000000001',
                },
              },
            },
          },
        },
      })

      .postOnce({
        name: 'queryPullRequests2',
        matcher: 'https://api.github.com/graphql',
        response: {
          status: 200,
          body: {
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
        },
      });
  });

  test('when the PR is not assigned to a project yet', async () => {
    const titles = ['layer-100/bar'];

    const pullRequestNumber = 'PR_0000000000000001';

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });
});
