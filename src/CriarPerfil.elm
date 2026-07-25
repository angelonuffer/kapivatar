port module CriarPerfil exposing (main)

import Browser
import Html exposing (Html, div, label, input, button, span, text, textarea)
import Html.Attributes exposing (type_, id, name, accept, style, class, for, required, value, src, alt, disabled, attribute)
import Html.Events exposing (on, onClick, onInput, onSubmit)
import File exposing (File)
import File.Select as Select
import Json.Decode as Decode
import Task

type alias Model =
    { nome : String
    , bio : String
    , capaName : String
    , capaPreview : Maybe String
    , capaValue : Maybe Decode.Value
    , fotoName : String
    , fotoPreview : Maybe String
    , fotoValue : Maybe Decode.Value
    , isSubmitting : Bool
    }

initialModel : Model
initialModel =
    { nome = ""
    , bio = ""
    , capaName = ""
    , capaPreview = Nothing
    , capaValue = Nothing
    , fotoName = ""
    , fotoPreview = Nothing
    , fotoValue = Nothing
    , isSubmitting = False
    }

type Msg
    = SetNome String
    | SetBio String
    | CapaSelected File Decode.Value
    | CapaPreviewReady String
    | FotoSelected File Decode.Value
    | FotoPreviewReady String
    | TriggerClick String
    | SubmitForm

-- Ports
port enviarPerfil : { nome : String, bio : String, capa : Maybe Decode.Value, foto : Maybe Decode.Value } -> Cmd msg
port clickInput : String -> Cmd msg

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        SetNome val ->
            ( { model | nome = val }, Cmd.none )

        SetBio val ->
            ( { model | bio = val }, Cmd.none )

        CapaSelected file value ->
            ( { model | capaName = File.name file, capaValue = Just value }
            , Task.perform CapaPreviewReady (File.toUrl file)
            )

        CapaPreviewReady url ->
            ( { model | capaPreview = Just url }, Cmd.none )

        FotoSelected file value ->
            ( { model | fotoName = File.name file, fotoValue = Just value }
            , Task.perform FotoPreviewReady (File.toUrl file)
            )

        FotoPreviewReady url ->
            ( { model | fotoPreview = Just url }, Cmd.none )

        TriggerClick id ->
            ( model, clickInput id )

        SubmitForm ->
            ( { model | isSubmitting = True }
            , enviarPerfil
                { nome = model.nome
                , bio = model.bio
                , capa = model.capaValue
                , foto = model.fotoValue
                }
            )

-- Decoders for file inputs
onFileChange : (File -> Decode.Value -> Msg) -> Attribute Msg
onFileChange msgCreator =
    let
        decoder =
            Decode.at [ "target", "files", "0" ]
                (Decode.map2 msgCreator
                    File.decoder
                    Decode.value
                )
    in
    on "change" decoder

type alias Attribute msg =
    Html.Attribute msg

view : Model -> Html Msg
view model =
    Html.form [ class "form-perfil", onSubmit SubmitForm ]
        [ -- Capa Field
          div [ class "form-campo" ]
            [ label [ for "capa" ] [ text "Capa" ]
            , div [ class "input-arquivo-container" ]
                [ input
                    [ type_ "file"
                    , id "capa"
                    , name "capa"
                    , accept "image/*"
                    , style "display" "none"
                    , onFileChange CapaSelected
                    ]
                    []
                , button
                    [ type_ "button"
                    , onClick (TriggerClick "capa")
                    ]
                    [ span [ class "material-symbols-outlined" ] [ text "upload_file" ]
                    , span [] [ text "Escolher imagem" ]
                    ]
                , case model.capaPreview of
                    Just url ->
                        div [ class "preview-container" ]
                            [ img [ class "preview-imagem", src url, alt "Prévia da capa" ] []
                            , span [ class "nome-arquivo" ] [ text model.capaName ]
                            ]

                    Nothing ->
                        text ""
                ]
            ]
        , -- Foto de Perfil Field
          div [ class "form-campo" ]
            [ label [ for "foto" ] [ text "Foto de Perfil" ]
            , div [ class "input-arquivo-container" ]
                [ input
                    [ type_ "file"
                    , id "foto"
                    , name "foto"
                    , accept "image/*"
                    , style "display" "none"
                    , onFileChange FotoSelected
                    ]
                    []
                , button
                    [ type_ "button"
                    , onClick (TriggerClick "foto")
                    ]
                    [ span [ class "material-symbols-outlined" ] [ text "upload_file" ]
                    , span [] [ text "Escolher imagem" ]
                    ]
                , case model.fotoPreview of
                    Just url ->
                        div [ class "preview-container" ]
                            [ img [ class "preview-imagem", src url, alt "Prévia da foto de perfil" ] []
                            , span [ class "nome-arquivo" ] [ text model.fotoName ]
                            ]

                    Nothing ->
                        text ""
                ]
            ]
        , -- Nome Field
          div [ class "form-campo" ]
            [ label [ for "nome" ] [ text "Nome" ]
            , input
                [ type_ "text"
                , id "nome"
                , name "nome"
                , required True
                , value model.nome
                , onInput SetNome
                ]
                []
            ]
        , -- Bio Field
          div [ class "form-campo" ]
            [ label [ for "bio" ] [ text "Bio" ]
            , textarea
                [ id "bio"
                , name "bio"
                , value model.bio
                , onInput SetBio
                ]
                []
            ]
        , -- Submit Button
          button
            [ type_ "submit"
            , disabled model.isSubmitting
            , attribute "aria-live" "polite"
            ]
            [ span [ class "material-symbols-outlined" ] [ text "save" ]
            , span []
                [ text
                    (if model.isSubmitting then
                        "Salvando..."

                     else
                        "Salvar Perfil"
                    )
                ]
            ]
        ]

-- Helper element
img : List (Attribute msg) -> List (Html msg) -> Html msg
img attrs children =
    Html.node "img" attrs children

main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> ( initialModel, Cmd.none )
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }
