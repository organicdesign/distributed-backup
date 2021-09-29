const Calc = require("./calc");

console.log(
	Calc.roundPercentages(
		Calc.trimPercenatages(
			[
				["key1", 0.31],
				["key2", 0.54123321],
				["key3", 0.00123123],
				["key4", 0.0121342141],
				["key5", 0.135401346]
			]
		)
	)
)

console.log(
	Calc.roundPercentages(
	Calc.convertToPercentages(
	Calc.trim(
		[
			["key6", 31],
			["key7", 54],
			["key8", 0],
			["key9", 3],
			["key10", 1],
			["key11", 140],
			["key12", 10],
			["key13", 43],
			["key14", 94]
		]
	)))
)

console.log(
	Calc.calculateSlots(30)
)
