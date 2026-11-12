import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";
import { resumirRecursoBiblioteca } from "@/lib/composicion-biblioteca";
import type { DetalleBiblioteca, ListadoBiblioteca } from "@/tipos/biblioteca";
import { esquemaRecursoBiblioteca } from "@/esquemas/biblioteca";

let bd: PGlite; let usuario: string; let ajeno: string; let consultorio: string; let fuente: string; let alimento: string;
const baseId = (n: number) => `00000000-0011-4000-8000-${String(n).padStart(12,"0")}`;
const crear = (tipo: string,nombre: string,contenido: object,otros = {}) => ({tipo,nombre,contenido,categoria:"Propios",etiquetas:[],relaciones:[],...otros});
async function operar(actor: string, accion: string, datos: object) {
  return (await comoUsuario(bd,actor,tx => tx.query<{id:string}>("select public.gestionar_biblioteca($1,$2::jsonb) id",[accion,JSON.stringify(datos)]))).rows[0].id;
}
async function copiar(actor: string, id: string, version = 1) {
  return (await comoUsuario(bd,actor,tx => tx.query<{id:string}>("select public.copiar_recurso_base($1,$2) id",[id,version]))).rows[0].id;
}
async function leer(id: string, version?: number) {
  return (await comoUsuario(bd,usuario,tx => tx.query<{datos:DetalleBiblioteca}>("select public.obtener_recurso_biblioteca($1,$2) datos",[id,version ?? null]))).rows[0].datos;
}
async function listarBase(actor: string, filtro: object) {
  return (await comoUsuario(bd,actor,tx => tx.query<{datos:ListadoBiblioteca}>("select public.consultar_catalogo_base($1::jsonb) datos",[JSON.stringify(filtro)]))).rows[0].datos;
}
const suplemento = () => ({...crear("suplemento","Suplemento ficticio",{marca:"Ensayo",medida_cantidad:30,medida_unidad:"g",energia:120,proteinas:24,carbohidratos:3,grasas:1,variantes:[{nombre:"Producto solo",medidas:1,preparacion:""},{nombre:"Con agregado",medidas:2,preparacion:"Mezclar según el registro."}],notas:"Ficticio, sin uso clínico"}),categoria:"Proteína",fuente_id:fuente,fuente_version:1,relaciones:[{referencia_id:alimento,referencia_version:1,detalle:{variante:1,cantidad:200,unidad:"g",gramos_por_unidad:1,rendimiento:1}}]});
beforeAll(async () => {
  bd=await crearBaseDePruebas(); usuario=await crearUsuario(bd,"biblioteca-11c@prueba.test"); ajeno=await crearUsuario(bd,"biblioteca-11c-ajeno@prueba.test");
  consultorio=(await comoUsuario(bd,usuario,tx=>tx.query<{id:string}>("select public.crear_consultorio_inicial('Ensayo 11C') id"))).rows[0].id;
  await comoUsuario(bd,ajeno,tx=>tx.query("select public.crear_consultorio_inicial('Otro 11C')"));
  fuente=await operar(usuario,"guardar",crear("fuente","Etiqueta ficticia",{referencia:"Ensayo",version:"1",licencia:"Propio de prueba",base:"Medida declarada",fecha:"",notas:""}));
  alimento=await operar(usuario,"guardar",crear("alimento","Agregado ficticio",{energia:60,proteinas:3,carbohidratos:5,grasas:3,notas:""},{fuente_id:fuente,fuente_version:1}));
},60000);
afterAll(async()=>{await bd?.close();});

describe("11C: suplementos y variantes",()=>{
  it("guarda variantes e ingredientes versionados y separa producto de mezcla",async()=>{
    const id=await operar(usuario,"guardar",suplemento());
    const original=await leer(id);
    expect(resumirRecursoBiblioteca(original.recurso,original.relaciones).calculo_suplemento?.variantes[1].mezcla.energia).toBe(360);
    await operar(usuario,"guardar",crear("alimento","Agregado actualizado",{energia:200,proteinas:3,carbohidratos:5,grasas:3,notas:""},{id:alimento,version:1,fuente_id:fuente,fuente_version:1}));
    await operar(usuario,"guardar",{...suplemento(),id,version:1});
    expect((await leer(id)).relaciones[0].instantanea.version).toBe(1);
    const copia=await operar(usuario,"duplicar",{id,version:2});
    expect((await leer(copia)).relaciones).toEqual((await leer(id)).relaciones.map(f=>({...f,recurso_id:copia})));
    await operar(usuario,"archivar",{id,version:2});
    await operar(usuario,"restaurar",{id,version:3});
    expect((await leer(id,1)).recurso.contenido.energia).toBe(120);
    expect((await leer(id)).recurso.version).toBe(4);
    await expect(operar(ajeno,"guardar",suplemento())).rejects.toThrow("fuente_invalida");
    expect((await comoUsuario(bd,ajeno,tx=>tx.query<{datos:unknown}>("select public.obtener_recurso_biblioteca($1) datos",[id]))).rows[0].datos).toBeNull();
  });
  it("revalida en PostgreSQL medidas, macros, variantes y pertenencia de ingredientes",async()=>{
    const datos=suplemento();
    for(const contenido of [{...datos.contenido,medida_cantidad:0},{...datos.contenido,proteinas:40},{...datos.contenido,variantes:[]},{...datos.contenido,variantes:[{nombre:"Repetida",medidas:1,preparacion:""},{nombre:"repetida",medidas:1,preparacion:""}]}]) await expect(operar(usuario,"guardar",{...datos,contenido})).rejects.toThrow("datos_invalidos");
    for(const detalle of [{...datos.relaciones[0].detalle,variante:4},{...datos.relaciones[0].detalle,variante:.5},{...datos.relaciones[0].detalle,rendimiento:2}]) await expect(operar(usuario,"guardar",{...datos,relaciones:[{...datos.relaciones[0],detalle}]})).rejects.toThrow("datos_invalidos");
    await expect(operar(usuario,"guardar",{...datos,categoria:"No admitida"})).rejects.toThrow("datos_invalidos");
    const otro=await copiar(ajeno,baseId(2));
    await expect(operar(usuario,"guardar",{...datos,relaciones:[{...datos.relaciones[0],referencia_id:otro}]})).rejects.toThrow("referencia_invalida");
  });
});

describe("11C: catálogo base protegido y copias propias",()=>{
  it("registra solo recursos válidos y referencias consistentes en la colección inicial",async()=>{
    const registros=await bd.query<{instantanea:DetalleBiblioteca}>("select instantanea from public.biblioteca_base_versiones");
    expect(registros.rows).toHaveLength(9);
    for(const {instantanea} of registros.rows) {
      const r=instantanea.recurso;
      expect(esquemaRecursoBiblioteca.safeParse({tipo:r.tipo,nombre:r.nombre,categoria:r.categoria,etiquetas:r.etiquetas,contenido:r.contenido,relaciones:instantanea.relaciones.map(f=>({referencia_id:f.referencia_id,referencia_version:f.instantanea.version,detalle:f.detalle})),...(r.fuente_id?{fuente_id:r.fuente_id,fuente_version:r.fuente_instantanea?.version}:{})}).success).toBe(true);
      for(const f of instantanea.relaciones) expect(f.referencia_id).toBe(f.instantanea.id);
    }
  });
  it("lista la colección curada con fuentes y categorías sin mezclar recursos propios",async()=>{
    const alimentos=await listarBase(usuario,{tipo:"alimento"});
    expect(alimentos.total).toBe(2); expect(alimentos.contadores).toMatchObject({fuente:1,alimento:2,grupo:3,plato:1,preparacion:1,plato_grupos:1});
    expect((await listarBase(usuario,{tipo:"alimento",q:"Banana",categoria:"Frutas"})).total).toBe(1);
    expect((await listarBase(usuario,{tipo:"alimento",pagina:2})).recursos).toHaveLength(0);
    const detalle=(await comoUsuario(bd,usuario,tx=>tx.query<{datos:DetalleBiblioteca}>("select public.obtener_recurso_base($1) datos",[baseId(2)]))).rows[0].datos;
    expect(detalle.recurso.origen).toBe("base");
    expect(detalle.recurso.procedencia_base?.licencia).toContain("CC0");
    expect(detalle.recurso.contenido).toMatchObject({energia:89,proteinas:1.09,carbohidratos:22.84,grasas:.33});
  });
  it("deniega anónimos, pacientes sin membresía y toda escritura directa",async()=>{
    await expect(comoAnonimo(bd,tx=>tx.query("select public.consultar_catalogo_base('{}')"))).rejects.toThrow();
    await expect(comoAnonimo(bd,tx=>tx.query("select public.copiar_recurso_base($1,1)",[baseId(2)]))).rejects.toThrow();
    const paciente=await crearUsuario(bd,"sin-membresia-11c@prueba.test");
    expect((await listarBase(paciente,{tipo:"alimento"})).total).toBe(0);
    await expect(copiar(paciente,baseId(2))).rejects.toThrow("sin_permiso");
    for(const tabla of ["biblioteca_base_versiones","biblioteca_procedencias_base"]) {
      await expect(comoUsuario(bd,usuario,tx=>tx.query(`delete from public.${tabla}`))).rejects.toThrow();
      const privilegios=await bd.query<{insertar:boolean;editar:boolean}>("select has_table_privilege('authenticated',$1,'INSERT') insertar,has_table_privilege('authenticated',$1,'UPDATE') editar",[`public.${tabla}`]);
      expect(privilegios.rows[0]).toEqual({insertar:false,editar:false});
    }
    await expect(operar(usuario,"archivar",{id:baseId(2),version:1})).rejects.toThrow("sin_permiso");
    await expect(comoUsuario(bd,usuario,tx=>tx.query("select privado.copiar_base_biblioteca($1,1,0)",[baseId(2)]))).rejects.toThrow();
  });
  it("copia un plato y todos sus insumos a ids propios con referencias del mismo consultorio",async()=>{
    const id=await copiar(usuario,baseId(8));
    const detalle=await leer(id);
    expect(id).not.toBe(baseId(8)); expect(detalle.recurso.origen).toBe("propio");
    expect(detalle.recurso.procedencia_base?.version).toBe(1);
    expect(detalle.relaciones).toHaveLength(2);
    expect(resumirRecursoBiblioteca(detalle.recurso,detalle.relaciones).calculo?.total.energia).toBe(180.5);
    for(const relacion of detalle.relaciones) {
      expect(relacion.referencia_id).not.toBe(relacion.instantanea.duplicado_de);
      const insumo=await leer(relacion.referencia_id);
      expect(insumo.recurso.procedencia_base).toBeDefined();
      expect(insumo.recurso.fuente_instantanea?.id).not.toBe(baseId(1));
    }
    const cruces=await bd.query<{cantidad:number}>("select count(*)::int cantidad from public.biblioteca_relaciones r join public.biblioteca_recursos i on i.id=r.referencia_id where r.recurso_id=$1 and i.consultorio_id<>$2",[id,consultorio]);
    expect(cruces.rows[0].cantidad).toBe(0);
    const copia=await operar(usuario,"duplicar",{id,version:1});
    expect((await leer(copia)).recurso.procedencia_base?.id).toBe(baseId(8));
    expect((await comoUsuario(bd,ajeno,tx=>tx.query("select * from public.biblioteca_procedencias_base where consultorio_id=$1",[consultorio]))).rows).toHaveLength(0);
    expect((await comoUsuario(bd,ajeno,tx=>tx.query<{datos:unknown}>("select public.obtener_recurso_biblioteca($1) datos",[id]))).rows[0].datos).toBeNull();
  });
  it("copia preparaciones y platos por grupos y permite editar sin modificar la base",async()=>{
    const preparacion=await copiar(usuario,baseId(7));
    const antes=await leer(preparacion);
    expect(resumirRecursoBiblioteca(antes.recurso,antes.relaciones).calculo?.por_100g.energia).toBe(89);
    const grupos=await copiar(usuario,baseId(9));
    const propio=await leer(grupos);
    await operar(usuario,"guardar",crear("plato_grupos","Esquema propio editado",{preparacion:"Revisión propia",alternativas:"",notas:""},{id:grupos,version:1,categoria:propio.recurso.categoria,relaciones:propio.relaciones.map(f=>({referencia_id:f.referencia_id,referencia_version:1,detalle:f.detalle}))}));
    expect((await listarBase(usuario,{tipo:"plato_grupos"})).recursos[0].nombre).toBe("Fruta y lácteo · esquema por partes");
    expect((await leer(grupos)).recurso.nombre).toBe("Esquema propio editado");
  });
  it("conserva las copias y el historial cuando se publica otra versión o se retira la base",async()=>{
    const copia=await copiar(usuario,baseId(2));
    await bd.query("insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia) select id,2,jsonb_set(jsonb_set(instantanea,'{recurso,version}','2'),'{recurso,contenido,energia}','100'),referencia,licencia from public.biblioteca_base_versiones where id=$1 and version=1",[baseId(2)]);
    const actual=await listarBase(usuario,{tipo:"alimento",q:"Banana"}); expect(actual.recursos).toHaveLength(1);expect(actual.recursos[0].version).toBe(2);
    expect((await leer(copia)).recurso.contenido.energia).toBe(89);
    await bd.query("update public.biblioteca_base_versiones set retirado_en=now() where id=$1 and version=2",[baseId(2)]);
    expect((await listarBase(usuario,{tipo:"alimento",q:"Banana"})).total).toBe(0);
    await expect(copiar(usuario,baseId(2),1)).rejects.toThrow("base_no_disponible");
    const cantidadAntes=(await bd.query<{cantidad:number}>("select count(*)::int cantidad from public.biblioteca_recursos")).rows[0].cantidad;
    await expect(copiar(usuario,baseId(8))).rejects.toThrow("base_no_disponible");
    expect((await bd.query<{cantidad:number}>("select count(*)::int cantidad from public.biblioteca_recursos")).rows[0].cantidad).toBe(cantidadAntes);
    expect((await leer(copia,1)).recurso.contenido.energia).toBe(89);
  });
  it("exige cobertura vigente también para catálogo base y copias",async()=>{
    const vencido=await crearUsuario(bd,"biblioteca-base-vencida@prueba.test");
    const c=(await comoUsuario(bd,vencido,tx=>tx.query<{id:string}>("select public.crear_consultorio_inicial('Vencido') id"))).rows[0].id;
    await bd.query("update public.pruebas_profesionales set vence_en=now()-interval '30 days' where consultorio_id=$1",[c]);
    expect((await listarBase(vencido,{tipo:"grupo"})).total).toBe(0);
    await expect(copiar(vencido,baseId(4))).rejects.toThrow("sin_permiso");
  });
  it("pagina y busca sin repetir filas ni mezclar categorías",async()=>{
    const plantilla=(await bd.query<{instantanea:DetalleBiblioteca}>("select instantanea from public.biblioteca_base_versiones where id=$1 and version=1",[baseId(4)])).rows[0].instantanea;
    for(let i=0;i<27;i++) {
      const id=baseId(100+i);
      await bd.query("insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia) values($1,1,$2::jsonb,'Ensayo','Propio ficticio')",[id,JSON.stringify({...plantilla,recurso:{...plantilla.recurso,id,nombre:`Paginación ${String(i).padStart(2,"0")}`,categoria:"Ensayo"}})]);
    }
    const primera=await listarBase(usuario,{tipo:"grupo",q:"Paginación",categoria:"Ensayo"});
    const segunda=await listarBase(usuario,{tipo:"grupo",q:"Paginación",categoria:"Ensayo",pagina:2});
    expect(primera.total).toBe(27);expect(primera.recursos).toHaveLength(25);expect(segunda.recursos).toHaveLength(2);
    expect(new Set([...primera.recursos,...segunda.recursos].map(r=>r.id)).size).toBe(27);
  });
});
