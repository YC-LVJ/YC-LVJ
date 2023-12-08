/* eslint-disable no-cond-assign */
/* eslint-disable no-await-in-loop */
import axios from 'axios';
import yaml from 'js-yaml';
import Schema from 'schemastery';
import { sleep } from '@hydrooj/utils';
import ProblemModel from '../model/problem';
import * as system from '../model/system';

async function addProblem(domainId: string, pid: string) {
    const token = system.get('judgeserver.token');
    const { data } = await axios.get(`https://zshfoj.com/judge-server/problem?pid=${pid}&token=${token}`);
    const npid = await ProblemModel.add(domainId, data.pid, data.title, data.content, 1, data.tags, {
        difficulty: data.difficulty,
        hidden: data.hidden,
    });
    await ProblemModel.addTestdata(domainId, npid, 'config.yaml', Buffer.from(yaml.dump({
        type: 'remote_judge',
        subType: 'judgeclient',
        target: pid.toString(),
        time: data.config.timeMin || 0,
        memory: data.config.memoryMin || 0,
    })));
}

async function run({ maxPid }, report: Function) {
    for (let pid = await ProblemModel.count('system', {}) + 1; pid <= maxPid; ++pid) {
        try {
            await addProblem('system', pid.toString());
        } catch (e) {
            console.log(e);
        }
        if (pid % 1000 === 0) report({ message: `OK ${pid} problems.` });
    }
}

export const apply = (ctx) => ctx.addScript(
    'import_all_lvj', 'Import all problems from LVJ, it may takes a long time!',
    Schema.object({ maxPid: Schema.number() }), run,
);
