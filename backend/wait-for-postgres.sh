#!/bin/sh
# wait-for-postgres.sh

set -e

host="$1"
shift
cmd="$@"

echo "Waiting for postgres at $host:5432..."

# Simple TCP check using nc (netcat)
until nc -z "$host" 5432 2>/dev/null; do
  >&2 echo "Postgres port not ready - sleeping"
  sleep 2
done

>&2 echo "Postgres port is open - waiting 5 more seconds for full startup"
sleep 5

>&2 echo "Postgres is ready - executing command"
exec $cmd
