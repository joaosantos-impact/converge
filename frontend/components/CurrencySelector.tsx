'use client';

import { DollarSign, Euro, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/app/providers';

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  const icons = {
    USD: DollarSign,
    EUR: Euro,
    BTC: Bitcoin,
  };

  const Icon = icons[currency];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-sm">
          <Icon className="h-4 w-4" />
          <span className="sr-only">Mudar moeda</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-sm">
        <DropdownMenuItem onClick={() => setCurrency('USD')} className="rounded">
          <DollarSign className="mr-2 h-4 w-4" />
          USD ($)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCurrency('EUR')} className="rounded">
          <Euro className="mr-2 h-4 w-4" />
          EUR (€)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCurrency('BTC')} className="rounded">
          <Bitcoin className="mr-2 h-4 w-4" />
          BTC (₿)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
