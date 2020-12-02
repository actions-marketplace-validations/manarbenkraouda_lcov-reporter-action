import { details, summary, b, fragment, table, tbody, tr, th } from "./html"

import { percentage } from "./lcov"
import { tabulate } from "./tabulate"

export function comment(lcov, options) {
	var message = [
		options.base
			? `Coverage after merging ${b(options.head)} into ${b(options.base)}`
			: `Coverage for this commit`,
		table(tbody(tr(th(percentage(lcov).toFixed(2), "%")))),
	];

	if (!options.hideTable) {
		message.push(
			"\n\n",
			details(summary("Coverage Report"), tabulate(lcov, options))
		);
	}
	return fragment(...message)
}

export function diff(lcov, before, options) {
	if (!before) {
		return comment(lcov, options)
	}

	const pbefore = percentage(before)
	const pafter = percentage(lcov)
	const pdiff = pafter - pbefore
	const plus = pdiff > 0 ? "+" : ""
	const arrow =
		pdiff === 0
			? ""
			: pdiff < 0
				? "▾"
				: "▴"

	message = [
		options.base
			? `Coverage after merging ${b(options.head)} into ${b(options.base)}`
			: `Coverage for this commit`,
		table(tbody(tr(th(pafter.toFixed(2), "%"), th(arrow, " ", plus, pdiff.toFixed(2), "%"))))
	];
	if (!options.hideTable) {
		message.push(
			"\n\n",
			details(summary("Coverage Report"), tabulate(lcov, options))
		)
	}
	return fragment(...message);
}
