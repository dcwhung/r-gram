/*
 * 讀媒體 bucket 嘅歌曲文字檔嘅錯誤：行號（檔案層面 = 0）+ reason + 書面語 message。
 * 逐行錯誤嘅 reason = packages/catalog 嘅錯誤碼，message 同 API-041 一樣（zhHant.tracks.reasons）；
 * 檔案層面嘅 BAD_ENCODING、FILE_NOT_FOUND 喺 zhHant.sync.fileReasons
 */
import { messageBuilder } from '../api/errors';
import { zhHant } from '../i18n/zh-Hant';
import { trackReasonMessage, type TrackReason } from '../tracks/errors';

export type FileReason = keyof typeof zhHant.sync.fileReasons;

export type TextErrorReason = TrackReason | FileReason;

export interface TextError {
    line: number;
    reason: TextErrorReason;
    message: string;
}

const fileReasonMessage = messageBuilder(zhHant.sync.fileReasons);

const isFileReason = (reason: string): reason is FileReason =>
    Object.hasOwn(zhHant.sync.fileReasons, reason);

/** 任何歌曲文字錯誤碼（檔案層面或者逐行）嘅句子；認唔到 = 原碼 */
export const textReasonMessage = (reason: string): string => {
    if (isFileReason(reason)) return fileReasonMessage(reason);
    if (Object.hasOwn(zhHant.tracks.reasons, reason))
        return trackReasonMessage(reason as TrackReason);
    return reason;
};

export const textError = (line: number, reason: TextErrorReason): TextError => ({
    line,
    reason,
    message: textReasonMessage(reason),
});
