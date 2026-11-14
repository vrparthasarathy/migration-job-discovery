# Task

## Requirement

A scheduled job script (Node 26 with TypeScript run natively, no dependencies, tests with `node:test` and mocks only) that checks a configured website URL. If the site is up it sends no notification; if it is down it requests an email alert through a notification system. The notifier is an abstract port and the only adapter delivered is a mock or dry-run one: no real email transport and no deployment. The behaviors B01 to B06 in the README were confirmed by the user.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build website-availability-check`.
