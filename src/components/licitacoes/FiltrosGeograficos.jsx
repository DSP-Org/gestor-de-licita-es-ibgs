export default function FiltrosGeograficos({
  ufs,
  municipios,
  modalidades,
  filtroUF,
  setFiltroUF,
  filtroMunicipio,
  setFiltroMunicipio,
  filtroModalidade,
  setFiltroModalidade,
}) {
  const selectClass =
    "flex-1 sm:flex-none min-w-0 px-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <>
      <select
        value={filtroUF}
        onChange={(e) => {
          setFiltroUF(e.target.value);
          setFiltroMunicipio("todos");
        }}
        className={selectClass}
      >
        <option value="todos">Todos os estados</option>
        {ufs.map((uf) => (
          <option key={uf} value={uf}>{uf}</option>
        ))}
      </select>

      <select
        value={filtroMunicipio}
        onChange={(e) => setFiltroMunicipio(e.target.value)}
        className={selectClass}
      >
        <option value="todos">Todas as cidades</option>
        {municipios.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select
        value={filtroModalidade}
        onChange={(e) => setFiltroModalidade(e.target.value)}
        className={selectClass}
      >
        <option value="todos">Todas as modalidades</option>
        {modalidades.map((mod) => (
          <option key={mod} value={mod}>{mod}</option>
        ))}
      </select>
    </>
  );
}