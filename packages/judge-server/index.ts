import {
    Context, Handler, ObjectId, param, ProblemModel, RecordModel, Types,
} from 'hydrooj';
import * as setting from 'hydrooj/src/model/setting';

class JudgeServerSubmitHandler extends Handler {
    @param('pid', Types.Int)
    @param('language', Types.String)
    @param('code', Types.String)
    @param('token', Types.String)
    async post(domainId: string, pid: string, language: string, code: string, token: string) {
        if (token !== '659f15fa-d8c5-4f62-bd2c-2b5d98ff1e05') {
            this.response.body = {
                success: false,
                message: 'Judge token not found.',
            };
            return;
        }
        const pdoc = await ProblemModel.get(domainId, pid);
        if (!pdoc) {
            this.response.body = {
                success: false,
                message: 'Problem not found.',
            };
            return;
        }
        const pconfig = pdoc.config;
        if (typeof pconfig === 'string') {
            this.response.body = {
                success: false,
                message: 'Config parse error.',
            };
            return;
        }
        if ((pconfig.langs && !pconfig.langs.includes(language)) || !setting.langs[language] || setting.langs[language].disabled) {
            this.response.body = {
                success: false,
                message: 'Language not allowed.',
            };
            return;
        }
        if (!['default', 'fileio', 'remote_judge'].includes(pconfig.type)) {
            this.response.body = {
                success: false,
                message: `You are not allowed to submit ${pconfig.type} problems.`,
            };
            return;
        }
        code = decodeURI(code);
        const rid = await RecordModel.add(domainId, pdoc.docId, 1, language, code, true, { type: 'judge' });
        this.response.body = {
            success: true,
            rid,
        };
    }
}

class JudgeResultHandler extends Handler {
    @param('rid', Types.ObjectId)
    @param('token', Types.String)
    async get(domainId: string, rid: ObjectId, token: string) {
        const rdoc = await RecordModel.get(domainId, rid);
        if (!rdoc) {
            this.response.body = {
                success: false,
                message: 'Record not found.',
            };
            return;
        }
        if (token !== '659f15fa-d8c5-4f62-bd2c-2b5d98ff1e05') {
            this.response.body = {
                success: false,
                message: 'Record not found.',
            };
            return;
        }
        this.response.body = {
            success: true,
            ...rdoc,
        };
    }
}

class ProblemDetailHandler extends Handler {
    @param('pid', Types.Int)
    @param('token', Types.String)
    async get(domainId: string, pid: string, token: string) {
        if (!token) {
            this.response.body = {
                success: false,
                message: 'Judge token not found.',
            };
            return;
        }
        if (token !== '659f15fa-d8c5-4f62-bd2c-2b5d98ff1e05') {
            this.response.body = {
                success: false,
                message: 'Judge token not found.',
            };
            return;
        }
        const pdoc = await ProblemModel.get(domainId, pid);
        if (!pdoc || pdoc.hidden) {
            this.response.body = {
                success: false,
                message: 'Problem not found.',
            };
        }
        this.response.body = {
            success: true,
            pid: pdoc.pid,
            title: pdoc.title,
            content: pdoc.content,
            difficulty: pdoc.difficulty || 0,
            tags: pdoc.tag || [],
            config: pdoc.config,
        };
    }
}

export async function apply(ctx: Context) {
    ctx.Route('judge_server_submit', '/judge-server/judge', JudgeServerSubmitHandler);
    ctx.Route('judge_server_result', '/judge-server/record', JudgeResultHandler);
    ctx.Route('judge_server_detail', '/judge-server/problem', ProblemDetailHandler);
}
