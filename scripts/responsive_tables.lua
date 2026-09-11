-- Keep wide handbook tables inside a keyboard-scrollable region on phones.
function Table(tbl)
  if quarto.doc.is_format("html") and not quarto.doc.is_format("revealjs") then
    return pandoc.Div({tbl}, pandoc.Attr("", {"table-responsive"}, {
      tabindex = "0",
      role = "region",
      ["aria-label"] = "Scrollable table / Tabla desplazable"
    }))
  end
end
