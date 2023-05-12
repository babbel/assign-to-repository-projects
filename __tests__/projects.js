import nock from 'nock'; // https://github.com/nock/nock

import { Octokit } from '@octokit/core';
import { paginateGraphql } from '@octokit/plugin-paginate-graphql';
import { RepositoryProjectsManager } from '../projects.js'; // eslint-disable-line import/extensions

const GraphQlOctokit = Octokit.plugin(paginateGraphql);
const octokit = new GraphQlOctokit({ auth: 'fake-token-value' }); // don't use default GITHUB_TOKEN token from env

const rpm = new RepositoryProjectsManager({
  owner: 'babbel-sandbox',
  repository: 'test-repo-jsaito-3',
  octokit,
});

const nockHTTPRequestsFoCreatingSingleProject = (nock) => {
    nock('https://api.github.com')
      .post('/graphql', (body) => /.*organization.login:.*/.test(body.query))
      .reply(200, {
        data: {
          organization: {
            id: 'O_kgDOAnsQgg',
            name: 'Babbel Sandbox',
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
                    id: 'PVT_kwDOAnsQgs4AQFxl',
                    title: 'layer-100/bar',
                    number: 1099,
                    fields: {
                      nodes: [{}, {},
                        {
                          id: 'PVTSSF_lADOAnsQgs4AQFxlzgKRc_A',
                          name: 'Status',
                          options: [
                            {
                              id: 'f75ad846',
                              name: 'Todo',
                            },
                            {
                              id: '47fc9ee4',
                              name: 'In Progress',
                            },
                            {
                              id: '98236657',
                              name: 'Done',
                            },
                          ],
                        }, {}, {}],
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
      .post('/graphql', (body) => /addProjectV2ItemById/.test(body.query))
      .reply(
        200,
        {
          data: {
            addProjectV2ItemById: {
              item: {
                id: 'PVTI_lADOAnsQgs4AQFxlzgGroec',
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
            updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_lADOAnsQgs4AQFxlzgGroec' } },
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
                     id: 'PVT_kwDOAnsQgs4AQFxl',
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
}

describe('RepositoryProjectsManager.assing() posts requests to the API', () => {
  beforeEach(() => {
    nock.restore();
    nock.activate();
  });

  afterEach(() => {
    nock.restore();
  });


  test('when the PR is not assigned to a project yet', async () => {
    const titles = [ 'layer-100/bar' ];

    const pullRequestNumber = 'PR_kwDOJSgWus5QXGKx';
    nockHTTPRequestsFoCreatingSingleProject(nock);

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });

  // setup and requests are identical fore example for assigning the PR to a new project because
  // addProjectV2ItemById and updateProjectV2ItemFieldValue are idempotent.
  test('when the PR is already assigned to a project', async () => {
    const titles = [ 'layer-100/bar' ];

    const pullRequestNumber = 'PR_kwDOJSgWus5QXGKx';

    nockHTTPRequestsFoCreatingSingleProject(nock);

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });
});
