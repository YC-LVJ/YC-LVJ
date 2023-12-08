/* eslint-disable no-cond-assign */
/* eslint-disable no-await-in-loop */
import axios from 'axios';
import yaml from 'js-yaml';
import Schema from 'schemastery';
import { fs } from '@hydrooj/utils';
import ProblemModel from '../model/problem';

async function addProblem(pdoc) {
    const npid = await ProblemModel.add('system', pdoc.pid, pdoc.title, pdoc.content, 1, pdoc.tags, {
        difficulty: pdoc.difficulty,
        hidden: pdoc.hidden,
    });
    await ProblemModel.addTestdata('system', npid, 'config.yaml', Buffer.from(yaml.dump({
        type: 'remote_judge',
        subType: 'judgeclient',
        target: pdoc.docId.toString(),
        time: pdoc.config.timeMin || 0,
        memory: pdoc.config.memoryMin || 0,
    })));
}

async function run({ path }, report: Function) {
    const problems = JSON.parse(fs.readFileSync(path).toString())['problems'];
    const tasks = [];
    for (const pdoc of problems) {
        tasks.push(addProblem(pdoc));
    }
    await Promise.all(tasks);
    return true;
}

export const apply = (ctx) => ctx.addScript(
    'import_all_lvj', 'Import all problems from LVJ, it may takes a long time!',
    Schema.object({ path: Schema.string() }), run,
);
