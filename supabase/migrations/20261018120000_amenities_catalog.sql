-- Catálogo completo de comodidades (ícones e categorias no código:
-- src/lib/amenities.ts) e gravação atômica das comodidades do imóvel.
--
-- Não destrutiva: as 15 comodidades existentes continuam com o mesmo id, slug
-- e nome; nenhum vínculo de imóvel é alterado. Novos itens entram com
-- "on conflict do nothing".

insert into public.amenities (slug, label) values
  ('ar-condicionado', 'Ar-condicionado'),
  ('aquecedor', 'Aquecedor'),
  ('ventilador-de-teto', 'Ventilador de teto'),
  ('ventiladores-portateis', 'Ventiladores portáteis'),
  ('cortinas-blackout', 'Cortinas blackout'),
  ('cobertores-travesseiros-extras', 'Cobertores e travesseiros extras'),
  ('entrada-privada', 'Entrada privada'),
  ('casa-um-piso', 'Casa de um piso'),
  ('estadias-longas', 'Estadias de longa duração permitidas'),
  ('aceita-pets', 'Aceita pets'),
  ('cozinha-equipada', 'Cozinha equipada'),
  ('cozinha-pequena', 'Cozinha pequena'),
  ('churrasqueira', 'Churrasqueira'),
  ('cozinha-externa', 'Cozinha ao ar livre'),
  ('fogao', 'Fogão'),
  ('forno', 'Forno'),
  ('micro-ondas', 'Micro-ondas'),
  ('refrigerador', 'Refrigerador'),
  ('freezer', 'Freezer'),
  ('frigobar', 'Frigobar'),
  ('cafeteira', 'Cafeteira'),
  ('cafe', 'Café'),
  ('cafe-da-manha', 'Café da manhã'),
  ('chaleira-eletrica', 'Chaleira elétrica'),
  ('liquidificador', 'Liquidificador'),
  ('maquina-de-pao', 'Máquina de pão'),
  ('panela-de-arroz', 'Panela de arroz elétrica'),
  ('torradeira', 'Torradeira'),
  ('lava-loucas', 'Máquina de lavar louça'),
  ('pratos-talheres', 'Pratos e talheres'),
  ('assadeira', 'Assadeira'),
  ('mesa-de-jantar', 'Mesa de jantar'),
  ('tacas-de-vinho', 'Taças de vinho'),
  ('utensilios-churrasco', 'Utensílios para churrasco'),
  ('itens-basicos-cozinha', 'Itens básicos de cozinha'),
  ('lixeira-compactadora', 'Lixeira compactadora'),
  ('agua-quente', 'Água quente'),
  ('banheira', 'Banheira'),
  ('banheira-hidromassagem', 'Banheira de hidromassagem'),
  ('bide', 'Bidê'),
  ('xampu', 'Xampu'),
  ('condicionador', 'Condicionador'),
  ('sabonete-corpo', 'Sabonete para o corpo'),
  ('gel-de-banho', 'Gel de banho'),
  ('secador-de-cabelo', 'Secador de cabelo'),
  ('produtos-de-limpeza', 'Produtos de limpeza'),
  ('roupa-de-cama', 'Roupa de cama e banho'),
  ('maquina-de-lavar', 'Máquina de lavar'),
  ('secadora', 'Secadora'),
  ('ferro-de-passar', 'Ferro de passar'),
  ('cabides', 'Cabides'),
  ('varal', 'Varal para secar roupas'),
  ('guarda-roupa', 'Local para guardar as roupas'),
  ('mosquiteiro', 'Mosquiteiro'),
  ('piscina', 'Piscina'),
  ('academia', 'Academia'),
  ('equipamento-exercicios', 'Equipamento para exercícios'),
  ('sauna', 'Sauna'),
  ('cinema', 'Cinema'),
  ('mesa-de-bilhar', 'Mesa de bilhar'),
  ('pingue-pongue', 'Mesa de pingue-pongue'),
  ('boliche', 'Pista de boliche'),
  ('minigolfe', 'Minigolfe'),
  ('fliperama', 'Fliperama'),
  ('videogame', 'Console de videogame'),
  ('jogos-de-tabuleiro', 'Jogos de tabuleiro'),
  ('jogos-tamanho-real', 'Jogos em tamanho real'),
  ('sistema-de-som', 'Sistema de som'),
  ('piano', 'Piano'),
  ('toca-discos', 'Toca-discos'),
  ('sala-tematica', 'Sala temática'),
  ('sala-jogos-criancas', 'Sala de jogos para crianças'),
  ('livros', 'Livros e material de leitura'),
  ('rampa-de-skate', 'Rampa de skate'),
  ('parede-de-escalada', 'Parede de escalada'),
  ('gaiola-beisebol', 'Gaiola para treino de beisebol'),
  ('rinque-de-hoquei', 'Rinque de hóquei'),
  ('laser-tag', 'Laser tag'),
  ('pe-na-areia', 'Pé na areia'),
  ('vista-para-o-mar', 'Vista para o mar'),
  ('acesso-praia', 'Acesso à praia'),
  ('acesso-lago', 'Acesso ao lago'),
  ('acesso-resort', 'Acesso ao resort'),
  ('beira-da-agua', 'Na beira da água'),
  ('varanda', 'Varanda'),
  ('quintal', 'Quintal'),
  ('rede', 'Rede'),
  ('moveis-externos', 'Móveis na área externa'),
  ('jantar-externo', 'Área de jantar externa'),
  ('lareira-externa', 'Lareira externa'),
  ('lareira', 'Lareira interna'),
  ('chuveiro-externo', 'Chuveiro externo'),
  ('bicicletas', 'Bicicletas'),
  ('caiaque', 'Caiaque'),
  ('pista-de-esqui', 'Pista de esqui perto'),
  ('rampa-barcos', 'Rampa para barcos'),
  ('estacionamento', 'Estacionamento'),
  ('estacionamento-gratuito-local', 'Estacionamento gratuito no local'),
  ('estacionamento-gratuito-rua', 'Estacionamento gratuito na rua'),
  ('estacionamento-gratuito-fora', 'Estacionamento gratuito fora da propriedade'),
  ('estacionamento-pago-local', 'Estacionamento pago no local'),
  ('estacionamento-pago-fora', 'Estacionamento pago fora da propriedade'),
  ('carregador-veiculo-eletrico', 'Carregador de veículos elétricos'),
  ('carregador-bicicleta-eletrica', 'Carregador para bicicleta elétrica'),
  ('wi-fi', 'Wi-Fi'),
  ('wi-fi-portatil', 'Wi-Fi portátil'),
  ('ethernet', 'Conexão Ethernet'),
  ('tv', 'TV'),
  ('espaco-de-trabalho', 'Espaço de trabalho exclusivo'),
  ('detector-fumaca', 'Detector de fumaça'),
  ('detector-monoxido', 'Detector de monóxido de carbono'),
  ('extintor', 'Extintor de incêndio'),
  ('primeiros-socorros', 'Kit de primeiros socorros'),
  ('cofre', 'Cofre'),
  ('portaria-24h', 'Portaria 24 horas'),
  ('berco', 'Berço'),
  ('baba-eletronica', 'Babá eletrônica'),
  ('cadeirao', 'Cadeirão infantil'),
  ('cercadinho', 'Cercadinho portátil'),
  ('trocador', 'Trocador de bebê'),
  ('banheira-infantil', 'Banheira infantil'),
  ('talheres-infantis', 'Talheres para crianças'),
  ('livros-brinquedos-infantis', 'Livros e brinquedos infantis'),
  ('bicicletas-infantis', 'Bicicletas para crianças'),
  ('portao-seguranca-bebe', 'Portões de segurança para bebês'),
  ('protetor-canto-mesa', 'Protetores de canto de mesa'),
  ('protetor-tomada', 'Protetores de tomada'),
  ('protetor-lareira', 'Protetores de lareira'),
  ('protecao-janela', 'Proteção de janela'),
  ('recomendacao-baba', 'Recomendações de babá'),
  ('compostagem', 'Compostagem'),
  ('reciclagem', 'Reciclagem'),
  ('paineis-solares', 'Painéis solares'),
  ('limpeza-durante-estadia', 'Limpeza disponível durante a estadia'),
  ('lavanderia-proxima', 'Lavanderia nas proximidades'),
  ('condominio-fechado', 'Condomínio fechado'),
  ('area-de-lazer', 'Área de lazer no condomínio'),
  ('elevador', 'Elevador'),
  ('sala-de-estar-privativa', 'Sala de estar privativa'),
  ('guarda-bagagem', 'Acesso para deixar as bagagens')
  on conflict (slug) do nothing;

-- Troca as comodidades do imóvel pela lista de slugs, numa só transação:
-- ou grava tudo, ou nada (antes eram dois comandos separados no servidor).
-- Roda com as permissões de quem chama (security invoker): as políticas RLS
-- de property_amenities continuam valendo e só o admin grava.
create function public.set_property_amenities(p_property_id uuid, p_slugs text[])
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_slugs text[] := array(select distinct s from unnest(coalesce(p_slugs, '{}')) as s);
  v_unknown text;
  v_count integer;
begin
  if not (select private.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (select 1 from public.properties where id = p_property_id) then
    raise exception 'property_not_found' using errcode = 'P0002';
  end if;

  if cardinality(v_slugs) > 200 then
    raise exception 'too_many_amenities' using errcode = '22023';
  end if;

  select s into v_unknown
    from unnest(v_slugs) as s
   where not exists (select 1 from public.amenities a where a.slug = s)
   limit 1;
  if v_unknown is not null then
    raise exception 'unknown_amenity' using errcode = '22023', detail = v_unknown;
  end if;

  delete from public.property_amenities pa
   where pa.property_id = p_property_id
     and pa.amenity_id not in (select a.id from public.amenities a where a.slug = any (v_slugs));

  insert into public.property_amenities (property_id, amenity_id)
  select p_property_id, a.id from public.amenities a where a.slug = any (v_slugs)
  on conflict do nothing;

  select count(*) into v_count from public.property_amenities where property_id = p_property_id;
  return v_count;
end;
$$;

revoke execute on function public.set_property_amenities(uuid, text[]) from public, anon;
grant execute on function public.set_property_amenities(uuid, text[]) to authenticated, service_role;
