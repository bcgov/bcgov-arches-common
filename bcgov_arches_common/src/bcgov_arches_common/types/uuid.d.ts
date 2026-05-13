declare module 'uuid' {
    interface UUIDStatic {
        generate(): string;
    }

    const uuid: UUIDStatic;
    export = uuid;
}
