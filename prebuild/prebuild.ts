import { writeFileSync } from 'fs';
import { generateTuple, generateTupleSpec } from './tuple';

const NUM_PARAMETERS = 22;

writeFileSync('./src/check/arbitrary/TupleArbitrary.generated.ts', generateTuple(NUM_PARAMETERS));
writeFileSync('./test/unit/check/arbitrary/TupleArbitrary.generated.spec.ts', generateTupleSpec(NUM_PARAMETERS));