import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  reiniciar = () => {
    try {
      localStorage.removeItem("base44_access_token");
      localStorage.removeItem("token");
    } catch (e) {
      // ignora
    }
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4 border rounded-2xl bg-card p-8 shadow-sm">
          <h1 className="font-heading text-xl font-bold">Não foi possível carregar o app</h1>
          <p className="text-sm text-muted-foreground break-words">
            {this.state.error?.message || "Erro inesperado."}
          </p>
          <button
            onClick={this.reiniciar}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Limpar sessão e recarregar
          </button>
        </div>
      </div>
    );
  }
}