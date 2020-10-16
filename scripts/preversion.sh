#!/bin/bash

CURRENT_BRANCH=`git branch | grep \* | cut -d ' ' -f2`
COLOR_END=$'\e[0m'
COLOR_YELLOW=$'\e[0;33m'

function exit_with_error { echo "$COLOR_YELLOW$1$COLOR_END\n"; exit 1; }

if [[ "$CURRENT_BRANCH" != "main" ]]; then
	exit_with_error "You can only create new version from the \`main\` branch."
fi

if [[ `git status --short | grep -v "??" | wc -c` -ne 0 ]]; then
	exit_with_error "Your need a clean copy of the repository before creating a new version."
fi

git pull
yarn install

if [[ `git status --short | grep -v "??" | wc -c` -ne 0 ]]; then
	exit_with_error "Yarn lockfile is not up to date with your 'package.json' file. Commit an updated lockfile before creating a new version."
fi
