const form = document.querySelector("#form-agendamento");
const campoData = document.querySelector("#data");
const campoHorario = document.querySelector("#horario");
const lista = document.querySelector("#lista-agendamentos");
const mensagem = document.querySelector("#mensagem");
const STORAGE_KEY = "sorrisoLeveAgendamentos";

const horariosDisponiveis = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function dataLocalISO() {
  const agora = new Date();
  const fuso = agora.getTimezoneOffset();
  return new Date(agora.getTime() - fuso * 60000).toISOString().slice(0, 10);
}

campoData.min = dataLocalISO();

function obterAgendamentos() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function atualizarHorarios() {
  const dataSelecionada = campoData.value;
  campoHorario.innerHTML = '<option value="">Selecione um horário</option>';

  if (!dataSelecionada) return;

  const dia = new Date(`${dataSelecionada}T12:00:00`).getDay();
  if (dia === 0 || dia === 6) {
    campoHorario.innerHTML = '<option value="">A clínica não atende aos fins de semana</option>';
    return;
  }

  const ocupados = obterAgendamentos()
    .filter(item => item.data === dataSelecionada)
    .map(item => item.horario);

  horariosDisponiveis
    .filter(horario => !ocupados.includes(horario))
    .forEach(horario => {
      const option = document.createElement("option");
      option.value = horario;
      option.textContent = horario;
      campoHorario.appendChild(option);
    });

  if (campoHorario.options.length === 1) {
    campoHorario.innerHTML = '<option value="">Não há horários disponíveis</option>';
  }
}

function formatarData(data) {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR");
}

function renderizarAgendamentos() {
  const agendamentos = obterAgendamentos().sort((a, b) =>
    `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`)
  );
  lista.innerHTML = "";

  if (agendamentos.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhum agendamento por enquanto.</p>';
    return;
  }

  agendamentos.forEach(item => {
    const card = document.createElement("article");
    card.className = "agendamento-item";

    const detalhes = document.createElement("div");
    const nome = document.createElement("strong");
    nome.textContent = item.nome;
    const info = document.createElement("small");
    info.textContent = `${item.servico} • ${formatarData(item.data)} às ${item.horario} • ${item.telefone}`;
    detalhes.append(nome, info);

    const remover = document.createElement("button");
    remover.className = "remover";
    remover.type = "button";
    remover.textContent = "Cancelar";
    remover.setAttribute("aria-label", `Cancelar agendamento de ${item.nome}`);
    remover.addEventListener("click", () => {
      const atualizados = obterAgendamentos().filter(registro => registro.id !== item.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
      renderizarAgendamentos();
      atualizarHorarios();
    });

    card.append(detalhes, remover);
    lista.appendChild(card);
  });
}

campoData.addEventListener("change", atualizarHorarios);

form.addEventListener("submit", event => {
  event.preventDefault();
  mensagem.textContent = "";

  if (!form.reportValidity()) return;

  const dados = new FormData(form);
  const novoAgendamento = {
    id: Date.now(),
    nome: dados.get("nome").trim(),
    telefone: dados.get("telefone").trim(),
    servico: dados.get("servico"),
    data: dados.get("data"),
    horario: dados.get("horario"),
    observacoes: dados.get("observacoes").trim()
  };

  if (new Date(`${novoAgendamento.data}T12:00:00`).getDay() === 0 ||
      new Date(`${novoAgendamento.data}T12:00:00`).getDay() === 6) {
    mensagem.textContent = "Selecione um dia de segunda a sexta-feira.";
    return;
  }

  const agendamentos = obterAgendamentos();
  const horarioOcupado = agendamentos.some(item =>
    item.data === novoAgendamento.data && item.horario === novoAgendamento.horario
  );

  if (horarioOcupado) {
    mensagem.textContent = "Esse horário acabou de ser ocupado. Escolha outro.";
    atualizarHorarios();
    return;
  }

  agendamentos.push(novoAgendamento);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agendamentos));
  mensagem.textContent = "Agendamento registrado neste navegador!";
  form.reset();
  campoData.min = dataLocalISO();
  campoHorario.innerHTML = '<option value="">Escolha a data primeiro</option>';
  renderizarAgendamentos();
});

renderizarAgendamentos();
