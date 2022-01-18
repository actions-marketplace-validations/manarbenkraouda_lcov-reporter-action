import { promises as fs } from "fs"
import core from "@actions/core"
import artifact from '@actions/artifact'
import { GitHub, context } from "@actions/github"

import { parse } from "./lcov"
import { diff } from "./comment"
import { writeFileSync }

const GH_MAX_CHAR = 65536

async function main() {
	const token = core.getInput("github-token")
	const lcovFile = core.getInput("lcov-file") || "./coverage/lcov.info"
	const baseFile = core.getInput("lcov-base")
	const hideTable = core.getInput("hide-table") === "true"

	const raw = await fs.readFile(lcovFile, "utf-8").catch(err => null)
	if (!raw) {
		console.log(`No coverage report found at '${lcovFile}', exiting...`)
		return
	}

	const baseRaw = baseFile && await fs.readFile(baseFile, "utf-8").catch(err => null)
	if (baseFile && !baseRaw) {
		console.log(`No coverage report found at '${baseFile}', ignoring...`)
	}

	const options = {
		repository: context.payload.repository.full_name,
		prefix: `${process.env.GITHUB_WORKSPACE}/`,
		hideTable: true
	};

	if (context.eventName === "pull_request") {
		options.commit = context.payload.pull_request.head.sha;
		options.head = context.payload.pull_request.head.ref;
		options.base = context.payload.pull_request.base.ref;
	} else if (context.eventName === "push") {
		options.commit = context.payload.after;
		options.head = context.ref;
	}

	const lcov = await parse(raw)
	const baselcov = baseRaw && await parse(baseRaw)

	if (context.eventName === "pull_request") {
		var output = diff(lcov, baselcov, options);
		const artifactClient = artifact.create();
		const artifactName = `code-coverage-report-${context.ref}-${context.sha}`;
		fs.writeFileSync(`./coverage/lcov-${context.ref}-${context.sha}.info.html`, output);
		const files = [`./coverage/lcov-${context.ref}-${context.sha}.info.html`];
		const rootDirectory = '.';
		const options = {
    	continueOnError: false
		};
		const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
		await new GitHub(token).issues.createComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			issue_number: context.payload.pull_request.number,
			body: output.slice(0, GH_MAX_CHAR),
		})
	} else if (context.eventName === "push") {
		var output = diff(lcov, baselcov, options);
		const artifactClient = artifact.create();
		const artifactName = `code-coverage-report-${context.ref}-${context.sha}`;
		fs.writeFileSync(`./coverage/lcov-${context.ref}-${context.sha}.info.html`, output);
		const files = [`./coverage/lcov-${context.ref}-${context.sha}.info.html`];
		const rootDirectory = '.';
		const options = {
    	continueOnError: false
		};
		const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
		await new GitHub(token).repos.createCommitComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			commit_sha: options.commit,
			body: output.slice(0, GH_MAX_CHAR),
		})
	}
}

main().catch(function (err) {
	console.log(err)
	core.setFailed(err.message)
})
