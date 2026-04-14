#!/bin/bash
set -e

cd ~/remote-midi
git pull

cd /srv/reverse-proxy
docker compose up -d --build midi-relay

echo "Done. Checking health..."
sleep 2
docker logs midi-relay --tail 5

cd
