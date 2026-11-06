"use strict";

/* =========================================================
   Sorveteria Caseira - Script compartilhado por todas as páginas
   Os pedidos ficam salvos no navegador (localStorage).
   ========================================================= */

const CHAVE_PEDIDOS = "sorveteria_pedidos";
const STATUS_PEDIDO = ["Pendente", "Em produção", "Pronto", "Entregue"];

/* ---------- Funções utilitárias ---------- */
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escapar(texto) {
  const mapa = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(texto ?? "").replace(/[&<>"']/g, caractere => mapa[caractere]);
}

function dataDeHoje() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function lerPedidos() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS));
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    return [];
  }
}

function salvarPedidos(lista) {
  try {
    localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(lista));
    return true;
  } catch (erro) {
    return false;
  }
}

function mostrarMensagem(elemento, texto) {
  elemento.textContent = texto;
  elemento.hidden = false;
}

/* ---------- Rodapé e menu (todas as páginas) ---------- */
function iniciarRodape() {
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
}

function iniciarMenu() {
  const botao = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu-principal");
  if (!botao || !menu) return;

  botao.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    botao.setAttribute("aria-expanded", String(aberto));
  });
}

/* ---------- Página: Encomendas ---------- */
function iniciarEncomenda() {
  const form = document.getElementById("form-encomenda");
  if (!form) return;

  const total = document.getElementById("total");
  const mensagem = document.getElementById("mensagem-encomenda");
  form.elements.entrega.min = dataDeHoje();

  function calcularTotal() {
    const tamanho = form.querySelector('input[name="tamanho"]:checked');
    const quantidade = parseInt(form.elements.quantidade.value, 10) || 0;
    const preco = tamanho ? Number(tamanho.dataset.preco) : 0;
    const valor = preco * quantidade;
    total.textContent = formatarMoeda(valor);
    return valor;
  }

  form.addEventListener("input", calcularTotal);
  form.addEventListener("change", calcularTotal);
  form.addEventListener("reset", () => {
    mensagem.hidden = true;
    setTimeout(calcularTotal, 0);
  });

  form.addEventListener("submit", evento => {
    evento.preventDefault();

    const tamanho = form.querySelector('input[name="tamanho"]:checked');
    const pedido = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      criadoEm: new Date().toISOString(),
      nome: form.elements.nome.value.trim(),
      telefone: form.elements.telefone.value.trim(),
      email: form.elements.email.value.trim(),
      sabor: form.elements.sabor.value,
      tamanho: tamanho ? tamanho.value : "",
      quantidade: parseInt(form.elements.quantidade.value, 10) || 1,
      entrega: form.elements.entrega.value,
      pagamento: form.elements.pagamento.value,
      observacoes: form.elements.observacoes.value.trim(),
      total: calcularTotal(),
      status: "Pendente"
    };

    const pedidos = lerPedidos();
    pedidos.push(pedido);

    if (salvarPedidos(pedidos)) {
      form.reset();
      mostrarMensagem(
        mensagem,
        `Obrigado, ${pedido.nome}! Sua encomenda foi registrada. Você pode acompanhá-la na página Pedidos.`
      );
    } else {
      mostrarMensagem(mensagem, "Não foi possível salvar o pedido neste navegador.");
    }
  });

  calcularTotal();
}

/* ---------- Página: Pedidos ---------- */
function iniciarPedidos() {
  const corpo = document.getElementById("lista-pedidos");
  if (!corpo) return;

  const vazio = document.getElementById("sem-pedidos");

  function desenhar() {
    const pedidos = lerPedidos().sort((a, b) => a.entrega.localeCompare(b.entrega));

    corpo.innerHTML = pedidos.map(pedido => {
      const opcoes = STATUS_PEDIDO
        .map(status => `<option${status === pedido.status ? " selected" : ""}>${status}</option>`)
        .join("");

      return `<tr>
        <td>${formatarData(pedido.entrega)}</td>
        <td>${escapar(pedido.nome)}<br><small>${escapar(pedido.telefone)}</small></td>
        <td>${pedido.quantidade}× ${escapar(pedido.tamanho)} de ${escapar(pedido.sabor)}<br><small>${escapar(pedido.pagamento)}</small></td>
        <td class="col-num">${formatarMoeda(pedido.total)}</td>
        <td>
          <label class="sr-only" for="status-${pedido.id}">Status do pedido de ${escapar(pedido.nome)}</label>
          <select id="status-${pedido.id}" data-id="${pedido.id}">${opcoes}</select>
        </td>
        <td><button type="button" class="btn btn-danger btn-small" data-remover="${pedido.id}">Excluir</button></td>
      </tr>`;
    }).join("");

    const abertos = pedidos.filter(p => p.status !== "Entregue").length;
    const valor = pedidos.reduce((soma, p) => soma + p.total, 0);

    document.getElementById("resumo-total").textContent = pedidos.length;
    document.getElementById("resumo-abertos").textContent = abertos;
    document.getElementById("resumo-valor").textContent = formatarMoeda(valor);
    vazio.hidden = pedidos.length > 0;
  }

  corpo.addEventListener("change", evento => {
    const select = evento.target.closest("select[data-id]");
    if (!select) return;
    const pedidos = lerPedidos();
    const pedido = pedidos.find(p => p.id === select.dataset.id);
    if (pedido) {
      pedido.status = select.value;
      salvarPedidos(pedidos);
      desenhar();
    }
  });

  corpo.addEventListener("click", evento => {
    const botao = evento.target.closest("button[data-remover]");
    if (!botao) return;
    if (!confirm("Excluir este pedido?")) return;
    salvarPedidos(lerPedidos().filter(p => p.id !== botao.dataset.remover));
    desenhar();
  });

  desenhar();
}

/* ---------- Página: Contato ---------- */
function iniciarContato() {
  const form = document.getElementById("form-contato");
  if (!form) return;

  const mensagem = document.getElementById("mensagem-contato");

  form.addEventListener("submit", evento => {
    evento.preventDefault();
    const nome = form.elements.nome.value.trim();
    form.reset();
    mostrarMensagem(mensagem, `Obrigado, ${nome}! Recebemos sua mensagem e responderemos em breve.`);
  });
}

/* ---------- Início ---------- */
iniciarRodape();
iniciarMenu();
iniciarEncomenda();
iniciarPedidos();
iniciarContato();
