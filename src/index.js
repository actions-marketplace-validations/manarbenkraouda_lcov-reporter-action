import { promises as fs } from "fs"
import core from "@actions/core"
import { GitHub, context } from "@actions/github"

import { parse } from "./lcov"
import { diff } from "./comment"

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
	}

	if (context.eventName === "pull_request") {
		options.commit = context.payload.pull_request.head.sha
		options.head = context.payload.pull_request.head.ref
		options.base = context.payload.pull_request.base.ref
		hideTable
	} else if (context.eventName === "push") {
		options.commit = context.payload.after
		options.head = context.ref
		hideTable
	}

	const lcov = await parse(raw)
	const baselcov = baseRaw && await parse(baseRaw)

	if (context.eventName === "pull_request") {
		await new GitHub(token).issues.createComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			issue_number: context.payload.pull_request.number,
			body: diff(lcov, baselcov, options).slice(0, GH_MAX_CHAR),
		})
	} else if (context.eventName === "push") {
		await new GitHub(token).repos.createCommitComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			commit_sha: options.commit,
			body: diff(lcov, baselcov, options).slice(0, GH_MAX_CHAR),
		})
	}
}

main().catch(function (err) {
	console.log(err)
	core.setFailed(err.message)
})
