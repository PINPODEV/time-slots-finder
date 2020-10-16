#!/bin/bash
GITHUB_REPO_URI=`git remote get-url origin | perl -nle 'm/^.*[\/:]([^\/:]+\/[^\/]+)\.git$/; print $1'`
GIT_LAST_TAG=`git describe --abbrev=0 --tags | grep 'v*' | tail -n 1`

RELEASE_BODY="%23%23%23+Changes+log"
RELEASE_TITLE="Version+`echo $GIT_LAST_TAG | cut -c 2-`"

GITHUB_LINK="https://github.com/$GITHUB_REPO_URI/releases/new?tag=$GIT_LAST_TAG&title=$RELEASE_TITLE&body=$RELEASE_BODY"
COLOR_END=$'\e[0m'
COLOR_YELLOW=$'\e[0;33m'

echo "$COLOR_YELLOW\nDon't forget to write the changes log on Github:\n$COLOR_END$GITHUB_LINK\n"
if [[ "$OSTYPE" == "darwin"* ]]; then
	open $GITHUB_LINK
fi
