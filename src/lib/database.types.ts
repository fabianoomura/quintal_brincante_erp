export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ambiente: {
        Row: {
          ativo: boolean
          capacidade: number | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      colaborador: {
        Row: {
          ativo: boolean
          created_at: string
          funcao: string | null
          id: string
          nome: string
          papel_acesso: Database["public"]["Enums"]["papel_acesso"]
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao?: string | null
          id?: string
          nome: string
          papel_acesso?: Database["public"]["Enums"]["papel_acesso"]
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao?: string | null
          id?: string
          nome?: string
          papel_acesso?: Database["public"]["Enums"]["papel_acesso"]
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      colonia: {
        Row: {
          ativo: boolean
          created_at: string
          fim: string
          id: string
          inicio: string
          nome: string
          vagas: number | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fim: string
          id?: string
          inicio: string
          nome: string
          vagas?: number | null
          valor: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          nome?: string
          vagas?: number | null
          valor?: number
        }
        Relationships: []
      }
      config_sistema: {
        Row: {
          aviso_antecedencia_min: number
          aviso_tempo_ativo: boolean
          capacidade_dia: number | null
          conciliacao_automatica: boolean
          created_at: string
          desconto_ativo: boolean
          desconto_irmao_percentual: number | null
          id: number
          tolerancia_min: number
          valor_feriado: number | null
        }
        Insert: {
          aviso_antecedencia_min?: number
          aviso_tempo_ativo?: boolean
          capacidade_dia?: number | null
          conciliacao_automatica?: boolean
          created_at?: string
          desconto_ativo?: boolean
          desconto_irmao_percentual?: number | null
          id?: number
          tolerancia_min?: number
          valor_feriado?: number | null
        }
        Update: {
          aviso_antecedencia_min?: number
          aviso_tempo_ativo?: boolean
          capacidade_dia?: number | null
          conciliacao_automatica?: boolean
          created_at?: string
          desconto_ativo?: boolean
          desconto_irmao_percentual?: number | null
          id?: number
          tolerancia_min?: number
          valor_feriado?: number | null
        }
        Relationships: []
      }
      contato: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          primeiro_nome: string | null
          rg: string | null
          sobrenome: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          primeiro_nome?: string | null
          rg?: string | null
          sobrenome?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          primeiro_nome?: string | null
          rg?: string | null
          sobrenome?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      crianca: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          consentimento_em: string | null
          consentimento_por: string | null
          created_at: string
          endereco: string | null
          foto: string | null
          id: string
          logradouro: string | null
          nascimento: string | null
          nome: string
          numero: string | null
          primeiro_nome: string | null
          saude: string | null
          sobrenome: string | null
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          consentimento_em?: string | null
          consentimento_por?: string | null
          created_at?: string
          endereco?: string | null
          foto?: string | null
          id?: string
          logradouro?: string | null
          nascimento?: string | null
          nome: string
          numero?: string | null
          primeiro_nome?: string | null
          saude?: string | null
          sobrenome?: string | null
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          consentimento_em?: string | null
          consentimento_por?: string | null
          created_at?: string
          endereco?: string | null
          foto?: string | null
          id?: string
          logradouro?: string | null
          nascimento?: string | null
          nome?: string
          numero?: string | null
          primeiro_nome?: string | null
          saude?: string | null
          sobrenome?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      crianca_contato: {
        Row: {
          contato_id: string
          crianca_id: string
          papel: Database["public"]["Enums"]["papel_contato"]
        }
        Insert: {
          contato_id: string
          crianca_id: string
          papel: Database["public"]["Enums"]["papel_contato"]
        }
        Update: {
          contato_id?: string
          crianca_id?: string
          papel?: Database["public"]["Enums"]["papel_contato"]
        }
        Relationships: [
          {
            foreignKeyName: "crianca_contato_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crianca_contato_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
        ]
      }
      feriado: {
        Row: {
          ativo: boolean
          created_at: string
          data: string
          id: string
          nome: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data: string
          id?: string
          nome: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data?: string
          id?: string
          nome?: string
          valor?: number | null
        }
        Relationships: []
      }
      inscricao_colonia: {
        Row: {
          colonia_id: string
          created_at: string
          crianca_id: string
          id: string
          valor: number
        }
        Insert: {
          colonia_id: string
          created_at?: string
          crianca_id: string
          id?: string
          valor: number
        }
        Update: {
          colonia_id?: string
          created_at?: string
          crianca_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_colonia_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "colonia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_colonia_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamento: {
        Row: {
          capture_method: string | null
          conciliado_por: string | null
          created_at: string
          crianca_id: string
          desconto: number
          descricao: string
          id: string
          order_nsu: string | null
          origem_id: string | null
          origem_tipo: string | null
          pago_em: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["status_lancamento"]
          transaction_nsu: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          capture_method?: string | null
          conciliado_por?: string | null
          created_at?: string
          crianca_id: string
          desconto?: number
          descricao: string
          id?: string
          order_nsu?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          pago_em?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["status_lancamento"]
          transaction_nsu?: string | null
          valor: number
          vencimento: string
        }
        Update: {
          capture_method?: string | null
          conciliado_por?: string | null
          created_at?: string
          crianca_id?: string
          desconto?: number
          descricao?: string
          id?: string
          order_nsu?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          pago_em?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["status_lancamento"]
          transaction_nsu?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagem_template: {
        Row: {
          ativo: boolean
          categoria: string
          chave: string
          created_at: string
          id: string
          nome: string
          ordem: number
          status_aprovacao: string
          texto: string
          tipo: string
          tipo_ocorrencia: Database["public"]["Enums"]["tipo_ocorrencia"] | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          chave: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          status_aprovacao?: string
          texto: string
          tipo?: string
          tipo_ocorrencia?:
            | Database["public"]["Enums"]["tipo_ocorrencia"]
            | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          chave?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          status_aprovacao?: string
          texto?: string
          tipo?: string
          tipo_ocorrencia?:
            | Database["public"]["Enums"]["tipo_ocorrencia"]
            | null
        }
        Relationships: []
      }
      mensagem_variavel: {
        Row: {
          ativo: boolean
          chave: string
          created_at: string
          descricao: string
          exemplo: string | null
          id: string
          ordem: number
          placeholder: string
          rotulo: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          created_at?: string
          descricao: string
          exemplo?: string | null
          id?: string
          ordem?: number
          rotulo: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          created_at?: string
          descricao?: string
          exemplo?: string | null
          id?: string
          ordem?: number
          rotulo?: string
        }
        Relationships: []
      }
      mensalidade: {
        Row: {
          ativo: boolean
          created_at: string
          crianca_id: string
          dia_vencimento: number
          dias_semana: number[] | null
          fim: string | null
          id: string
          inicio: string
          plano_id: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          crianca_id: string
          dia_vencimento: number
          dias_semana?: number[] | null
          fim?: string | null
          id?: string
          inicio: string
          plano_id?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          crianca_id?: string
          dia_vencimento?: number
          dias_semana?: number[] | null
          fim?: string | null
          id?: string
          inicio?: string
          plano_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "mensalidade_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidade_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "plano_mensalidade"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao: {
        Row: {
          contato_id: string
          conteudo: string | null
          created_at: string
          crianca_id: string
          enviada_em: string | null
          id: string
          ocorrencia_id: string | null
          presenca_id: string | null
          provider_msg_id: string | null
          status: Database["public"]["Enums"]["status_notificacao"]
          template: string | null
          tentativas: number
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
        }
        Insert: {
          contato_id: string
          conteudo?: string | null
          created_at?: string
          crianca_id: string
          enviada_em?: string | null
          id?: string
          ocorrencia_id?: string | null
          presenca_id?: string | null
          provider_msg_id?: string | null
          status?: Database["public"]["Enums"]["status_notificacao"]
          template?: string | null
          tentativas?: number
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
        }
        Update: {
          contato_id?: string
          conteudo?: string | null
          created_at?: string
          crianca_id?: string
          enviada_em?: string | null
          id?: string
          ocorrencia_id?: string | null
          presenca_id?: string | null
          provider_msg_id?: string | null
          status?: Database["public"]["Enums"]["status_notificacao"]
          template?: string | null
          tentativas?: number
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacao_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacao_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacao_presenca_id_fkey"
            columns: ["presenca_id"]
            isOneToOne: false
            referencedRelation: "presenca"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia: {
        Row: {
          created_at: string
          criado_por: string | null
          crianca_id: string
          descricao: string | null
          id: string
          presenca_id: string | null
          tipo: Database["public"]["Enums"]["tipo_ocorrencia"]
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          crianca_id: string
          descricao?: string | null
          id?: string
          presenca_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_ocorrencia"]
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          crianca_id?: string
          descricao?: string | null
          id?: string
          presenca_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_ocorrencia"]
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencia_presenca_id_fkey"
            columns: ["presenca_id"]
            isOneToOne: false
            referencedRelation: "presenca"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_mensalidade: {
        Row: {
          ativo: boolean
          created_at: string
          dias_por_semana: number
          id: string
          nome: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_por_semana: number
          id?: string
          nome: string
          valor: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_por_semana?: number
          id?: string
          nome?: string
          valor?: number
        }
        Relationships: []
      }
      preco_hora: {
        Row: {
          dia_semana: number
          hora: number
          valor: number
        }
        Insert: {
          dia_semana: number
          hora: number
          valor: number
        }
        Update: {
          dia_semana?: number
          hora?: number
          valor?: number
        }
        Relationships: []
      }
      presenca: {
        Row: {
          ambiente_id: string | null
          created_at: string
          crianca_id: string
          data: string
          entrada: string
          id: string
          obs: string | null
          origem: Database["public"]["Enums"]["origem_presenca"]
          saida: string | null
          tarifa_hora: number | null
          tempo_contratado_min: number | null
          valor: number | null
        }
        Insert: {
          ambiente_id?: string | null
          created_at?: string
          crianca_id: string
          data: string
          entrada: string
          id?: string
          obs?: string | null
          origem: Database["public"]["Enums"]["origem_presenca"]
          saida?: string | null
          tarifa_hora?: number | null
          tempo_contratado_min?: number | null
          valor?: number | null
        }
        Update: {
          ambiente_id?: string | null
          created_at?: string
          crianca_id?: string
          data?: string
          entrada?: string
          id?: string
          obs?: string | null
          origem?: Database["public"]["Enums"]["origem_presenca"]
          saida?: string | null
          tarifa_hora?: number | null
          tempo_contratado_min?: number | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "presenca_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "ambiente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presenca_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
        ]
      }
      reposicao: {
        Row: {
          created_at: string
          crianca_id: string
          data_falta: string
          data_reposicao: string | null
          id: string
          obs: string | null
        }
        Insert: {
          created_at?: string
          crianca_id: string
          data_falta: string
          data_reposicao?: string | null
          id?: string
          obs?: string | null
        }
        Update: {
          created_at?: string
          crianca_id?: string
          data_falta?: string
          data_reposicao?: string | null
          id?: string
          obs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reposicao_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "crianca"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_colaborador: { Args: never; Returns: boolean }
    }
    Enums: {
      origem_presenca: "mensalista" | "diaria" | "espaco_kids" | "colonia"
      papel_acesso: "admin" | "operador"
      papel_contato: "responsavel" | "autorizado" | "emergencia"
      status_lancamento: "pendente" | "pago" | "cancelado"
      status_notificacao: "pendente" | "enviada" | "entregue" | "lida" | "falha"
      tipo_notificacao:
        | "aviso_tempo"
        | "ocorrencia"
        | "aviso_geral"
        | "boas_vindas"
        | "agradecimento_checkout"
      tipo_ocorrencia:
        | "banheiro"
        | "nao_adaptou"
        | "saude"
        | "comportamento"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      origem_presenca: ["mensalista", "diaria", "espaco_kids", "colonia"],
      papel_acesso: ["admin", "operador"],
      papel_contato: ["responsavel", "autorizado", "emergencia"],
      status_lancamento: ["pendente", "pago", "cancelado"],
      status_notificacao: ["pendente", "enviada", "entregue", "lida", "falha"],
      tipo_notificacao: [
        "aviso_tempo",
        "ocorrencia",
        "aviso_geral",
        "boas_vindas",
        "agradecimento_checkout",
      ],
      tipo_ocorrencia: [
        "banheiro",
        "nao_adaptou",
        "saude",
        "comportamento",
        "outro",
      ],
    },
  },
} as const
