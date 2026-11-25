/*
 * 掃描：資料夾入面嘅檔按類別同歌號分組（純函數）。同一個歌號同一類有多過一個檔 = 衝突，唔自動揀。
 * 音檔做錨（Functional Spec D54；CR-006 定案）：資料夾有音檔（`.m4a`／`.mp3`）嘅歌號，或者資料庫入面手動指定咗音檔嘅歌
 */
import {
    classifyFile,
    type CoverKind,
    type NumberedKind,
    type UnmatchedReason,
} from './classifyFile';

/** R2 list 出嚟嘅一個檔（etag 係 httpEtag：有引號） */
export interface ScanFile {
    key: string;
    bytes: number;
    etag: string;
}

export interface NumberedFile extends ScanFile {
    kind: NumberedKind;
    no: number;
}

export interface FileGroups {
    /** key = `${kind}:${no}`；Map 保持第一次見到嘅次序 */
    numbered: Map<string, NumberedFile[]>;
    covers: Map<CoverKind, ScanFile[]>;
    unmatched: { key: string; reason: UnmatchedReason }[];
    /** 全部 key（判斷記住嘅檔仲喺唔喺度） */
    keys: ReadonlySet<string>;
}

export const groupKey = (kind: NumberedKind, no: number): string => `${kind}:${no}`;

const push = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
    map.set(key, [...(map.get(key) ?? []), value]);
};

/** 資料夾標記（`/` 結尾嘅 key）唔計 */
export const groupFiles = (files: readonly ScanFile[]): FileGroups => {
    const groups: FileGroups = {
        numbered: new Map(),
        covers: new Map(),
        unmatched: [],
        keys: new Set(files.map(({ key }) => key)),
    };
    for (const file of files.filter(({ key }) => !key.endsWith('/'))) {
        const found = classifyFile(file.key);
        if (found.kind === 'unmatched')
            groups.unmatched.push({ key: file.key, reason: found.reason });
        else if ('no' in found)
            push(groups.numbered, groupKey(found.kind, found.no), { ...file, ...found });
        else push(groups.covers, found.kind, file);
    }
    return groups;
};

export const filesOf = (groups: FileGroups, kind: NumberedKind, no: number): NumberedFile[] =>
    groups.numbered.get(groupKey(kind, no)) ?? [];

/** 啱啱好一個檔先回 */
export const singleOf = (
    groups: FileGroups,
    kind: NumberedKind,
    no: number,
): NumberedFile | undefined => {
    const files = filesOf(groups, kind, no);
    return files.length === 1 ? files[0] : undefined;
};

/** 某一類出現過嘅歌號（由細到大） */
export const numbersOf = (groups: FileGroups, kind: NumberedKind): number[] =>
    [...groups.numbered.values()]
        .flatMap((files) => files.slice(0, 1))
        .filter((file) => file.kind === kind)
        .map(({ no }) => no)
        .sort((a, b) => a - b);
