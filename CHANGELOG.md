## [1.0.2] - 2023-07-10
- Refactoring. Extract GraphQL calls to dedicated class and re-write tests replacing nock by fetch-mock
  for node.js versions larger than v16.

## [1.0.1] - 2023-06-08
- Bug fix. The action when run again no longer assigns PRs to projects that have already been assigned.
  As a consequence the status field no longer changes to the default "Todo" when the action is triggered twice.

## [1.0.0] - 2023-05-10

- Initial release
