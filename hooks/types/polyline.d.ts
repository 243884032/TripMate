declare module "@mapbox/polyline" {
    export function decode(
        str: string,
        precision?: number
    ): [number, number][];
}
