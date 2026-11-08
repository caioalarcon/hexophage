export const rules = [
  { id:'current', name:'Linear atual', price:10 },
  { id:'size', name:'Tamanho do carimbo', price:10, sizeDoubling:6 },
  { id:'order-energy', name:'Energia progressiva por carimbada', price:10, energyOrderDoubling:8 },
  { id:'field', name:'Preço marginal pelo campo', price:10, fieldDoubling:24 },
  { id:'fixed-tax', name:'Manutenção progressiva do núcleo', price:10, fixedTaxScale:24 },
  { id:'mana', name:'Energia + mana fixa por ação', price:10, manaInterval:3000 },
  { id:'mana-gems', name:'Mana progressiva por carimbada', price:10, manaInterval:3000, orderDoubling:4 },
  { id:'field-mana', name:'Campo + mana', price:10, fieldDoubling:24, manaInterval:3000 },
  { id:'core-wallet', name:'Mana armazenada no núcleo', price:10, manaInterval:9000, manaStorage:'core' },
  { id:'core-field', name:'Núcleo + preço pelo campo', price:10, manaInterval:9000, manaStorage:'core', fieldDoubling:96 },
  { id:'recent-mana', name:'Núcleo + pressão de plantio recente', price:10, manaInterval:9000, manaStorage:'core', fieldDoubling:96, pressureHalfLife:60000 },
  { id:'battery', name:'Núcleo com reserva de energia e mana', price:10, manaInterval:9000, manaStorage:'core', battery:1000, fieldDoubling:96, pressureHalfLife:60000 },
  { id:'field-mana-decay', name:'Campo + mana + perda das reservas', price:10, fieldDoubling:24, manaInterval:3000, halfLife:60000 },
];
export const policies = [
  { id:'flipper',name:'Repetir flipper',start:['p2'],repeat:['p2'] },
  { id:'glider',name:'Flipper inicial → gliders',start:['p2'],repeat:['glider'] },
  { id:'rotator',name:'Flipper inicial → rotativos',start:['p2'],repeat:['p42rot'] },
  { id:'mixed',name:'Flipper, dois gliders e P4',start:['p2'],repeat:['glider','p2','glider','p4f'] },
  { id:'gun',name:'Quatro flippers → guns P20',start:Array(4).fill('p2'),repeat:['gun20'],fundGun:true },
  { id:'nursery',name:'Doze flippers, um crescedor e gliders',start:[...Array(12).fill('p2'),'stalk'],repeat:['glider'] },
];
