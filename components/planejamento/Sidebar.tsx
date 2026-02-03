"use client"

import React from 'react';
import { Order } from '@/types/planejamento';
import { Calendar, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  orders: Order[];
}

const Sidebar: React.FC<SidebarProps> = ({ orders }) => {

  // Cores para diferentes status
  const getStatusColor = (status?: string) => {
    switch (status) {
      case '1':
        return 'bg-green-500';
      case '4':
        return 'bg-blue-500';
      case '5':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case '1':
        return 'Finalizado';
      case '4':
        return 'Em Execução';
      case '5':
        return 'Proposta';
      default:
        return '';
    }
  };

  return (
    <div className="w-80 h-full bg-background border-r flex flex-col overflow-hidden shadow-sm">
      <div className="p-6 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Planejamento</h1>
            <p className="text-xs text-muted-foreground">Gestão de Fluxo de Produção</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <section>
            <div className="mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Produtos em Execução
              </h2>
              <p className="text-xs text-muted-foreground">
                Cada produto tem 7 etapas automáticas. Conecte-as arrastando as setas.
              </p>
            </div>
            <div className="space-y-2">
              {orders.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum produto encontrado.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Produtos de orçamentos em execução aparecerão aqui automaticamente com todas as etapas criadas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-all cursor-pointer border-l-4" style={{ borderLeftColor: order.color }}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-primary">#{order.id}</span>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0">
                          {order.quantity} un
                        </Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{order.name}</h4>
                      <div className="text-[11px] text-muted-foreground">
                        👤 {order.client}
                      </div>
                      <div className="mt-2 pt-2 border-t border-muted">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                          <span>7 etapas criadas</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
           <Calendar size={16} />
           <span className="font-medium">Hoje: {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
