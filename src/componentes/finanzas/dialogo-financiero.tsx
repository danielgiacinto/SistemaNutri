'use client';
import { useState, type ReactNode } from 'react';
import { Button } from '@/componentes/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/componentes/ui/dialog';

export function DialogoFinanciero({titulo,descripcion,boton,children,principal=false}:{titulo:string;descripcion:string;boton:ReactNode;children:(cerrar:()=>void)=>ReactNode;principal?:boolean}) {
  const [abierto,fijarAbierto]=useState(false);
  return <Dialog open={abierto} onOpenChange={fijarAbierto}>
    <Button variant={principal?'default':'outline'} size="sm" onClick={()=>fijarAbierto(true)}>{boton}</Button>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>{titulo}</DialogTitle><DialogDescription>{descripcion}</DialogDescription></DialogHeader>
      {children(()=>fijarAbierto(false))}
    </DialogContent>
  </Dialog>;
}
