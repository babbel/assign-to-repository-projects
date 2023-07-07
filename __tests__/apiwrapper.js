import { Octokit } from '@octokit/core';
import fetchMock from 'fetch-mock'; // https://github.com/wheresrhys/fetch-mock

import { paginateGraphql } from '@octokit/plugin-paginate-graphql';
import { ApiWrapper } from '../apiwrapper';

const GraphQlOctokit = Octokit.plugin(paginateGraphql);
const octokit = new GraphQlOctokit({ auth: 'fake-token-value' }); // don't use default GITHUB_TOKEN token from env

const apiWrapper = new ApiWrapper({ octokit });

const mockResponse = (name, data) => {
  fetchMock.postOnce({
    name,
    matcher: 'https://api.github.com/graphql',
    response: {
      status: 200,
      body: { data },
    },
  });
};

describe('ApiWrapper', () => {
  afterAll(() => {
    fetchMock.reset();
  });

  describe('.fetchAssignedProjects()', () => {
    const data = {
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
    };

    const input = {
      pullRequestId: 'PVT_0000000000000001',
    };

    beforeEach(() => { mockResponse('fetchAssignedProjects', data); });

    afterEach(() => { fetchMock.reset(); });

    test('returns nodes', async () => {
      const nodes = await apiWrapper.fetchAssignedProjects(input);
      expect(nodes).toEqual(data.node.projectsV2.nodes); // checks deep
    });
  });

  // async fetchItemForPRId({ project, pullRequestId }) {
  describe('.fetchItemForPRId()', () => {
    const data = {
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
    };

    const input = {
      project: { id: 'PVT_000000000000001' },
      pullRequestId: 'PR_0000000000000001',
    };

    beforeEach(() => { mockResponse('fetchItemForPRId', data); });
    afterEach(() => { fetchMock.reset(); });

    test('returns project v2 item node', async () => {
      const node = await apiWrapper.fetchItemForPRId(input);
      expect(node).toEqual(data.node.items.nodes[0]); // checks deep
    });
  });

  describe('.deleteProjectItem()', () => {
    const data = {
      deleteProjectV2Item: {
        deletedItemId: 'PVTI_00000000000000000000000',
      },
    };

    const input = {
      project: { id: 'PVT_000000000000001' },
      item: { id: 'PVTI_00000000000000000000000' },
      clientMutationId: 'foo',
    };

    beforeEach(() => { mockResponse('deleteProjectItem', data); });
    afterEach(() => { fetchMock.reset(); });

    test('returns id of delted item', async () => {
      const id = await apiWrapper.deleteProjectItem(input);
      expect(id).toEqual(data.deleteProjectV2Item); // checks deep
    });
  });

  describe('.fetchRepositoryAndProjects()', () => {
    const data = {
      repository: {
        name: 'example-repository',
        id: 'R_0000000001',
        projectsV2: {
          nodes: [
            {
              id: 'PVT_kwDOAnsQgs4AP9Qq',
              title: 'layer-200/module-1',
            },
            {
              id: 'PVT_000000000000002',
              title: 'layer-100/module-2',
            },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: 'Nw',
          },
        },
      },
    };

    const input = {
      owner: 'acme',
      repositoryName: 'example-repository-name',
    };

    beforeEach(() => { mockResponse('fetchRepositoryAndProjects', data); });
    afterEach(() => { fetchMock.reset(); });

    test('returns object containing id', async () => {
      const repository = await apiWrapper.fetchRepositoryAndProjects(input);
      expect({ repository }).toEqual(data); // checks deep
    });
  });

  describe('.assignPRtoProject()', () => {
    const data = {
      addProjectV2ItemById: {
        item: {
          id: 'PVTI_0000000000000001',
        },
      },
    };

    const input = {
      pullRequestId: 'PR_0000000000000001',
      project: { id: 'PVT_0000000000000001' },
      clientMutationId: 'foo',
    };

    beforeEach(() => { mockResponse('assignPRtoProject', data); });
    afterEach(() => { fetchMock.reset(); });

    test('returns object containing proect item', async () => {
      const item = await apiWrapper.assignPRtoProject(input);
      expect({ item }).toEqual(data.addProjectV2ItemById); // checks deep
    });
  });
});
