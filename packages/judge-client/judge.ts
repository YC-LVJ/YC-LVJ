/* eslint-disable no-await-in-loop */
import axios from "axios";
import {
    JudgeHandler,
    RecordModel,
    sleep,
    STATUS,
    SystemModel,
    TaskModel,
} from "hydrooj";
import { Logger } from "hydrooj/src/logger";

const logger = new Logger("judge-client");
const judgingStatus = [
    STATUS.STATUS_FETCHED,
    STATUS.STATUS_COMPILING,
    STATUS.STATUS_JUDGING,
    STATUS.STATUS_WAITING,
];

export async function apply() {
    if (process.env.NODE_APP_INSTANCE !== "0") return;
    if (process.env.HYDRO_CLI) return;

    const host = "https://lvjcn.tboj.cn/";
    const token = SystemModel.get("judgeserver.token");

    async function judge(task) {
        logger.info(`Start judging ${task.rid}`);
        const rdoc = await RecordModel.get(task.domainId, task.rid);
        task = Object.assign(rdoc, task);
        const next = (payload) =>
            JudgeHandler.next({
                ...payload,
                rid: task.rid,
                rdoc,
                domainId: task.domainId,
            });
        const end = (payload) =>
            JudgeHandler.end({
                ...payload,
                rid: task.rid,
                rdoc,
                domainId: task.domainId,
            });
        const client = axios.create({
            headers: {
                Accept: "application/json",
            },
            baseURL: host,
        });
        await next({ status: STATUS.STATUS_FETCHED });
        async function fetchResult() {
            let submitRetries = 3;
            let data: any = null;
            while (submitRetries > 0) {
                try {
                    const _ = await client.post("/judge-server/judge", {
                        token,
                        pid: task.target,
                        code: encodeURI(task.code),
                        language: "cc.cc14o2",
                    });
                    data = _.data;
                    break;
                } catch {
                    submitRetries--;
                }
            }

            if (!data.success) {
                end({ status: STATUS.STATUS_SYSTEM_ERROR, message: data.message });
                return;
            }
            const rid = data.rid;
            next({ status: STATUS.STATUS_JUDGING });
            let done = false;
            let tries = 0;
            while (!done && tries <= 300) {
                await sleep(1000);
                let srdoc: any;
                let queryFailed = 0;
                while (queryFailed <= 3) {
                    try {
                        srdoc = (
                            await client.get(`/judge-server/record?token=${token}&rid=${rid}`)
                        ).data;
                        break;
                    } catch {
                        queryFailed++;
                        if (queryFailed > 3) {
                            end({
                                status: STATUS.STATUS_SYSTEM_ERROR,
                                message: "Failed to get judge result from server.",
                            });
                            return;
                        }
                        await sleep(500); // 等待一下再重试
                    }
                }
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
            if (!done)
                end({
                    status: STATUS.STATUS_SYSTEM_ERROR,
                    message: "Judging timeout exceeded 300s.",
                });
            logger.info("Judge finished");
        }
        fetchResult().catch((error) => {
            end({ status: STATUS.STATUS_SYSTEM_ERROR, message: error.message });
        }).then(() => {
            logger.info(`End judging ${task.rid}`);
        });
    }
    TaskModel.consume(
        { type: "remotejudge", subType: "judgeclient" },
        judge,
        false
    );
    logger.info("Judge client is now running!");
}
