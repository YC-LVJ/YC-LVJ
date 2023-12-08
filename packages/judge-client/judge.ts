/* eslint-disable no-await-in-loop */
import axios from 'axios';
import {
    JudgeHandler, RecordModel, sleep, STATUS, SystemModel, TaskModel,
} from 'hydrooj';
import { Logger } from 'hydrooj/src/logger';

const logger = new Logger('judge-client');
const judgingStatus = [STATUS.STATUS_FETCHED, STATUS.STATUS_COMPILING, STATUS.STATUS_JUDGING, STATUS.STATUS_WAITING];

export async function apply() {
    if (process.env.NODE_APP_INSTANCE !== '0') return;
    if (process.env.HYDRO_CLI) return;

    const host = 'https://zshfoj.com';
    const token = SystemModel.get('judgeserver.token');

    async function judge(task) {
        logger.info(`Start judging ${task.rid}`);
        const rdoc = await RecordModel.get(task.domainId, task.rid);
        task = Object.assign(rdoc, task);
        const next = (payload) => JudgeHandler.next({ ...payload, rid: task.rid, rdoc });
        const end = (payload) => JudgeHandler.end({ ...payload, rid: task.rid, rdoc });
        const client = axios.create({
            headers: {
                Accept: 'application/json',
            },
            baseURL: host,
        });
        await next({ status: STATUS.STATUS_FETCHED });
        try {
            const { data } = await client.post('/judge-server/judge', {
                token,
                pid: task.target,
                code: encodeURI(task.code),
                language: 'cc.cc14o2',
            });
            if (!data.success) {
                end({ status: STATUS.STATUS_SYSTEM_ERROR, message: data.message });
                return;
            }
            const rid = data.rid;
            next({ status: STATUS.STATUS_JUDGING, message: '由 LVJ 提供评测服务。' });
            let done = false;
            let tries = 0;
            while (!done && tries <= 1000) {
                await sleep(300);
                const srdoc = (await client.get(`/judge-server/record?token=${token}&rid=${rid}`)).data;
                if (judgingStatus.includes(srdoc.status)) {
                    tries++;
                    continue;
                }
                end({
                    status: srdoc.status,
                    score: srdoc.score,
                    compilerTexts: srdoc.compilerTexts,
                    time: srdoc.time,
                    memory: srdoc.memory,
                    cases: srdoc.testCases,
                });
                done = true;
            }
            if (!done) end({ status: STATUS.STATUS_SYSTEM_ERROR, message: 'Judging timeout exceeded 300s.' });
            logger.info('Judge finished');
        } catch (e) {
            end({ status: STATUS.STATUS_SYSTEM_ERROR, message: e.message });
        }
    }
    TaskModel.consume({ type: 'remotejudge', subType: 'judgeclient' }, judge, false);
    logger.info('Judge client is now running!');
}
