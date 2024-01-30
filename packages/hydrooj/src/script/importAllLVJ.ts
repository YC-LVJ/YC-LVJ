/* eslint-disable no-await-in-loop */
import yaml from 'js-yaml';
import Schema from 'schemastery';
import { fs } from '@hydrooj/utils';
import ProblemModel from '../model/problem';

async function addProblem(pdoc) {
    const opdoc = await ProblemModel.get('system', pdoc.docId);
    if (opdoc) return;
    let npid = await ProblemModel.add('system', pdoc.pid || undefined, pdoc.title, pdoc.content, 1, pdoc.tags, {
        difficulty: pdoc.difficulty,
        hidden: pdoc.hidden,
    });
    while (npid !== pdoc.docId) {
        npid = await ProblemModel.add('system', pdoc.pid || undefined, pdoc.title, pdoc.content, 1, pdoc.tags, {
            difficulty: pdoc.difficulty,
            hidden: pdoc.hidden,
        });
    }
    const pconfig: any = pdoc.config ? yaml.load(pdoc.config) : {};
    await ProblemModel.addTestdata('system', npid, 'config.yaml', Buffer.from(yaml.dump({
        type: 'remote_judge',
        subType: 'judgeclient',
        target: pdoc.docId.toString(),
        time: pconfig?.time || 0,
        memory: pconfig?.memory || 0,
    })));
}

async function run({ path }, report: Function) {
    const problems = JSON.parse(fs.readFileSync(path).toString())['problems'];
    problems.sort((a, b) => a.docId - b.docId);
    for (const pdoc of problems) {
        await addProblem(pdoc);
    }
    return true;
}

export const apply = (ctx) => ctx.addScript(
    'import_all_lvj', 'Import all problems from LVJ, it may takes a long time!',
    Schema.object({ path: Schema.string() }), run,
);
