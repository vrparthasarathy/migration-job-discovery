# Logic notes

1. Read one refund request.
2. Call the gateway; on a failure wait and call again, up to three tries.
3. After the last failed try the refund is marked failed and nothing else happens.
