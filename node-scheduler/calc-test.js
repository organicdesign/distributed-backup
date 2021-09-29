const Calc = require("./calc");

console.log(
	Calc.roundPercentages(
		Calc.trimPercenatages(
			[
				0.31,
				0.54123321,
				0.00123123,
				0.0121342141,
				0.135401346
			]
		)
	)
)

console.log(
	Calc.roundPercentages(
	Calc.convertToPercentages(
	Calc.trim(
		[
			31,
			54,
			0,
			3,
			1,
			140,
			10,
			43,
			94
		]
	)))
)

console.log(
	Calc.calculateSlots(30)
)
