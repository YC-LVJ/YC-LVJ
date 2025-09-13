/* eslint-disable no-await-in-loop */
import axios from 'axios';
import {
    Context, Handler, param, PERM, PermissionError, ProblemModel, SystemModel, Types, yaml,
} from 'hydrooj';

declare module 'hydrooj' {
    interface SystemKeys {
        'judgeserver.token': string
    }
}

class ZSHFOJImportHandler extends Handler {
    async get() {
        this.response.template = 'problem_import_zshfoj.html';
    }

    @param('pid', Types.String)
    async post(domainId: string, pid: string) {
        const token = SystemModel.get('judgeserver.token');
        if (!token) throw new PermissionError();
        const { data } = await axios.get(`https://zshfoj.com/judge-server/problem?pid=${pid}&token=${token}`);
        const npid = await ProblemModel.add(domainId, data.pid, data.title, data.content, this.user._id, data.tags, {
            difficulty: data.difficulty,
        });
        await ProblemModel.addTestdata(domainId, npid, 'config.yaml', Buffer.from(yaml.dump({
            type: 'remote_judge',
            subType: 'judgeclient',
            target: pid.toString(),
            time: data.config.timeMin || 0,
            memory: data.config.memoryMin || 0,
        })));
        this.response.redirect = `/p/${data.pid}`;
    }
}

export async function apply(ctx: Context) {
    ctx.Route('problem_import_zshfoj', '/problem/import/zshfoj', ZSHFOJImportHandler, PERM.PERM_CREATE_PROBLEM);
    ctx.inject('ProblemAdd', 'problem_import_zshfoj', { icon: 'copy', text: 'From ZSHFOJ' });
    ctx.i18n.load('zh', {
        'From ZSHFOJ': '从 LVJ 导入',
    });
}
