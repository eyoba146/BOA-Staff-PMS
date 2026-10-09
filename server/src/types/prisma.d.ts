declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $queryRaw(query: any, ...args: any[]): Promise<any>;
    user: any;
    position: any;
    kpi: any;
    kpiAssignment: any;
    kpiEntry: any;
    feedback: any;
    announcement: any;
    conversation: any;
    auditLog: any;
    verificationCode: any;
    systemSettings: any;
  }
}
