declare module '@useferret/lang' {
  export function ferToJsonV2(ferContent: string): any;
  export function jsonToFerV2(jsonData: any): string;
  export function ferToEnvJsonV2(ferContent: string): any;
  export function envJsonToFerV2(jsonData: any): string;
  export function collectionFerToJson(ferContent: string): any;
  export function jsonToCollectionFer(jsonData: any): string;
  export function dotenvToJson(envContent: string): Record<string, string>;
  export function outdentString(str: string, spaces?: number): string;
}
