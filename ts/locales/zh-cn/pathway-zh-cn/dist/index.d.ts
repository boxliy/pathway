import { RegionDataset, Parser, ParseResult } from '@pathway/core';

type ZhAddressParseOptions = {
    dataset?: RegionDataset;
    nameMaxLength?: number;
};
declare function parseZhAddress(input: string, options?: ZhAddressParseOptions): ParseResult;
declare function createZhAddressParser(options?: ZhAddressParseOptions): Parser<string, ParseResult>;
declare function createDefaultZhDataset(): RegionDataset;
declare function normalizeZhText(input: string): string;
declare const zhAddressInternals: {
    normalizeZhText: typeof normalizeZhText;
};

export { type ZhAddressParseOptions, createDefaultZhDataset, createZhAddressParser, parseZhAddress, zhAddressInternals };
