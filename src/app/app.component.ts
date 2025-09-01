import { AfterViewInit, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent implements AfterViewInit {
  constructor() { }

  ngAfterViewInit() {
    // console.log(getComputedStyle('$0').borderTopWidth)
    console.log(window.visualViewport?.scale)
    console.log(window.devicePixelRatio)
  }
}
