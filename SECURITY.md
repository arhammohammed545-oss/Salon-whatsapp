# Security Policy

## Project status

This project is a work in progress and has not undergone an independent security audit. Do not assume it is production-ready.

## Reporting a vulnerability

Please do not report exploitable vulnerabilities in public issues. Contact the repository maintainer privately through GitHub to coordinate a report. Include the affected component, impact, and safe reproduction steps. Do not include real customer data or live credentials.

## Sensitive data

Never commit secrets, access tokens, service-role keys, database credentials, customer records, phone numbers, or real webhook payloads. If a credential is exposed, revoke or rotate it immediately; removing it from the latest version is not sufficient if it remains in Git history.
