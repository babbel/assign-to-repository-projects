import nock from 'nock'; // https://github.com/nock/nock

import { Octokit } from '@octokit/core';
import { paginateGraphql } from '@octokit/plugin-paginate-graphql';
import { RepositoryProjectsManager } from '../projects.js'; // eslint-disable-line import/extensions

const GraphQlOctokit = Octokit.plugin(paginateGraphql);
const octokit = new GraphQlOctokit({ auth: 'fake-token-value' }); // don't use default GITHUB_TOKEN token from env

const rpm = new RepositoryProjectsManager({
  owner: 'acme',
  repository: 'example-repository',
  octokit,
});

const nockHTTPRequestsForAssigningSinglePR = () => {
  nock('https://api.github.com')
    .post('/graphql', (body) => /.*organization.login:.*/.test(body.query))
    .reply(200, {
      data: {
        organization: {
          id: 'O_0000000001',
          name: 'Acme Corporation',
        },
      },
    })
    .post('/graphql', (body) => /projectsV2.first:/.test(body.query))
    .reply(
      200,
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
    )
    .post('/graphql', (body) => /on PullRequest/.test(body.query))
    .twice()
    .reply(
      200,
      {
        data: {
          node:
             {
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
    )
    .post('/graphql', (body) => /addProjectV2ItemById/.test(body.query))
    .reply(
      200,
      {
        data: {
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_0000000000000001',
            },
          },
        },
      },
    )
    .post('/graphql', (body) => /updateProjectV2ItemFieldValue/.test(body.query))
    .reply(
      200,
      {
        data: {
          updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_0000000000000001' } },
        },
      },
    )
    .post('/graphql', (body) => /on PullRequest/.test(body.query))
    .twice()
    .reply(
      200,
      {
        data: {
          node:
             {
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
    );
};

const nockHTTPRequestsForAlreadyAssignedProject = () => {
  nock('https://api.github.com')
    .post('/graphql', (body) => /.*organization.login:.*/.test(body.query))
    .reply(200, {
      data: {
        organization: {
          id: 'O_0000000001',
          name: 'Acme Corporation',
        },
      },
    })
    .post('/graphql', (body) => /projectsV2.first:/.test(body.query))
    .reply(
      200,
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
    )
    .post('/graphql', (body) => /on PullRequest/.test(body.query))
    .twice()
    .reply(
      200,
      {
        data: {
          node:
             {
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
    )
    .post('/graphql', (body) => /addProjectV2ItemById/.test(body.query))
    .reply(
      200,
      {
        data: {
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_0000000000000001',
            },
          },
        },
      },
    )
    .post('/graphql', (body) => /updateProjectV2ItemFieldValue/.test(body.query))
    .reply(
      200,
      {
        data: {
          updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_0000000000000001' } },
        },
      },
    )
    .post('/graphql', (body) => /on PullRequest/.test(body.query))
    .twice()
    .reply(
      200,
      {
        data: {
          node:
             {
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
    );
};

const nockHTTPRequestsForUnassigning = () => {
  nock('https://api.github.com')
    .post('/graphql', (body) => /.*organization.login:.*/.test(body.query))
    .reply(200, {
      data: {
        organization: {
          id: 'O_0000000001',
          name: 'Acme Corporation',
        },
      },
    })
    .post('/graphql', (body) => /projectsV2.first:/.test(body.query))
    .reply(
      200,
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
    )
    .post('/graphql', (body) => /on PullRequest/.test(body.query))
    .reply(
      200,
      {
        data: {
          node:
               {
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
    )
    .post('/graphql', (body) => /addProjectV2ItemById/.test(body.query))
    .reply(
      200,
      {
        data: {
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_0000000000000001',
            },
          },
        },
      },
    )
    .post('/graphql', (body) => /updateProjectV2ItemFieldValue/.test(body.query))
    .reply(
      200,
      {
        data: {
          updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_0000000000000001' } },
        },
      },
    )
    .post('/graphql', (body) => /on PullRequest/.test(body.query))
    .reply(
      200,
      {
        data: {
          node:
             {
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
    )
    .post('/graphql', (body) => /\.\.\. on ProjectV2 /.test(body.query))
    .reply(
      200,
      {
        data: {
          node: {
            number: 1099,
            items: {
              nodes: [
                {
                  id: 'PVTI_00000000000000000000001',
                  content: {
                    id: 'PR_0000000000000001',
                  },
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
    )
    .post('/graphql', (body) => /deleteProjectV2Item/.test(body.query))
    .reply(
      200,
      {
        data: {
          deleteProjectV2Item: { deletedItemId: 'PVTI_00000000000000000000000' },
        },
      },
    )
    .post('/graphql', (body) => /on PullRequest/.test(body.query))
    .reply(
      200,
      {
        data: {
          node:
             {
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
    );
};

describe('RepositoryProjectsManager.assing() posts requests to the API', () => {
  beforeAll(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('when the PR is not assigned to a project yet', async () => {
    const titles = ['layer-100/bar'];

    const pullRequestNumber = 'PR_0000000000000001';
    nockHTTPRequestsForAssigningSinglePR();

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });

  // setup and requests are identical fore example for assigning the PR to a new project because
  // addProjectV2ItemById and updateProjectV2ItemFieldValue are idempotent.
  test('when the PR is already assigned to a project', async () => {
    const titles = ['layer-100/bar'];

    const pullRequestNumber = 'PR_0000000000000001';

    nockHTTPRequestsForAlreadyAssignedProject();

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });

  test('when the PR is assigend to one project but should not be assigned to any project', async () => {
    const titles = [];
    nockHTTPRequestsForUnassigning();

    const pullRequestNumber = 'PR_0000000000000001';

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });
});
