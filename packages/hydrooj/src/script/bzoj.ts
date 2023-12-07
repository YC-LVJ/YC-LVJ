/* eslint-disable no-cond-assign */
/* eslint-disable no-await-in-loop */
import fs from 'fs';
import Schema from 'schemastery';
import { AdmZip, ProblemModel } from '../plugin-api';

async function run(_, report: Function) {
    const problems = fs.readdirSync('/home/ycrrjy/lydsy/');
    for (const problem of problems) {
        const pid = problem.replace('.zip', '');
        const npid = await ProblemModel.add('bzoj', `BZOJ${pid}`, `BZOJ${pid}`, `BZOJ${pid}`, 2);
        const zip = new AdmZip(`/home/ycrrjy/lydsy/${problem}`);
        const entries = zip.getEntries();
        for (const entry of entries) {
            await ProblemModel.addTestdata('bzoj', npid, entry.name, entry.getData());
        }
        report({ message: `OK ${pid}.` });
    }
}

export const apply = (ctx) => ctx.addScript(
    'bzoj', 'add bzoj problems',
    Schema.any(), run,
);
