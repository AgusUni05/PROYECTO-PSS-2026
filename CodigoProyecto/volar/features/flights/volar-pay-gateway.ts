/**
 * Adaptador simulado de pasarela de reembolsos (VolarPay).
 * No realiza llamadas de red: devuelve un gatewayRefundId determinista para
 * pruebas y desarrollo.
 */
export type RefundGatewayInput = {
  amount: number;
  ticketId: string;
  contingencyId: string;
};

export type RefundGatewayResult = {
  gatewayRefundId: string;
};

export interface RefundGateway {
  processRefund(input: RefundGatewayInput): Promise<RefundGatewayResult>;
}

export class VolarPayRefundGateway implements RefundGateway {
  async processRefund(input: RefundGatewayInput): Promise<RefundGatewayResult> {
    const suffix = input.ticketId.split("_").at(-1) ?? input.ticketId;
    return {
      gatewayRefundId: `VOLAR-REE-${suffix}-${Date.now()}`,
    };
  }
}

export const volarPayRefundGateway = new VolarPayRefundGateway();
