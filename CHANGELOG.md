# NOTE: CHANGELOG.md is deprecated

After the release of v1.0.6, please see the [GitHub release notes](https://github.com/babbel/assign-to-repository-projects/releases)
for the action in order to view the most up-to-date changes.

## [1.0.6] - 2024-02-19
- Dependency update: undici security release

## [1.0.5] - 2023-11-29
- Replace fetch-mock with MSW for mocking requests in tests.

## [1.0.4] - 2023-11-23
- Update action specification to node.js 20 and update actions/github lib.

## [1.0.3] - 2023-11-22
- Update to node.js 20 and unpin @actions packages.

## [1.0.2] - 2023-07-10
- Refactoring. Extract GraphQL calls to dedicated class and re-write tests replacing nock by fetch-mock
  for node.js versions larger than v16.

## [1.0.1] - 2023-06-08
- Bug fix. The action when run again no longer assigns PRs to projects that have already been assigned.
  As a consequence the status field no longer changes to the default "Todo" when the action is triggered twice.

## [1.0.0] - 2023-05-10

- Initial release
